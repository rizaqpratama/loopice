import {
  canTransitionManifestStatus,
  type ManifestStatus,
  type ManifestItemType,
} from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";
import { recordAudit } from "../../lib/auditLog";
import { getDispatchChecklist as computeDispatchChecklist } from "../trips/trips.service";

// Utilization above this fraction of vehicle capacity triggers a soft
// warning (returned to the caller, not an error) rather than a hard block.
const CAPACITY_WARNING_THRESHOLD = 0.9;

const MANIFEST_INCLUDE = {
  trip: true,
  originFacility: true,
  destinationFacility: true,
  items: { orderBy: { createdAt: "asc" } },
  statusHistory: { orderBy: { changedAt: "desc" } },
} satisfies Prisma.ManifestInclude;

async function generateManifestNumber(tenantId: string): Promise<string> {
  const count = await prisma.manifest.count({ where: { tenantId } });
  return `MANIFEST-${String(count + 1).padStart(6, "0")}`;
}

async function findScopedManifest(tenantId: string, id: string) {
  const manifest = await prisma.manifest.findFirst({
    where: { id, tenantId },
    include: MANIFEST_INCLUDE,
  });
  if (!manifest) throw new NotFoundError("Manifest not found");
  return manifest;
}

export interface CreateManifestInput {
  tripId: string;
  originFacilityId: string;
  destinationFacilityId: string;
}

export async function createManifest(
  tenantId: string,
  input: CreateManifestInput,
  userId: string | null
) {
  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, tenantId },
  });
  if (!trip) throw new BadRequestError("Trip not found");

  const originFacility = await prisma.station.findFirst({
    where: { id: input.originFacilityId, tenantId },
  });
  if (!originFacility) throw new BadRequestError("Origin facility not found");

  const destinationFacility = await prisma.station.findFirst({
    where: { id: input.destinationFacilityId, tenantId },
  });
  if (!destinationFacility) throw new BadRequestError("Destination facility not found");

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const manifestNumber = await generateManifestNumber(tenantId);
    try {
      const created = await prisma.manifest.create({
        data: {
          tenantId,
          manifestNumber,
          tripId: input.tripId,
          originFacilityId: input.originFacilityId,
          destinationFacilityId: input.destinationFacilityId,
          status: "DRAFT",
          createdById: userId ?? undefined,
        },
        include: MANIFEST_INCLUDE,
      });

      domainEvents.emitTyped("manifest.created", {
        manifestId: created.id,
        tenantId,
        manifestNumber: created.manifestNumber,
        tripId: created.tripId,
      });

      return created;
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate unique manifest number");
}

export async function getManifest(tenantId: string, id: string) {
  return findScopedManifest(tenantId, id);
}

export interface ListManifestsParams {
  tripId?: string;
  status?: ManifestStatus;
  skip?: number;
  take?: number;
}

export async function listManifests(tenantId: string, params: ListManifestsParams) {
  return prisma.manifest.findMany({
    where: {
      tenantId,
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
    include: MANIFEST_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: params.skip ?? 0,
    take: params.take ?? 50,
  });
}

export interface AddManifestItemInput {
  shipmentId?: string;
  cargoItemId?: string;
  handlingUnitId?: string;
  itemType?: ManifestItemType;
  identifier?: string;
  plannedQuantity?: number;
  weight?: number;
  volume?: number;
  notes?: string;
  override?: boolean;
  overrideReason?: string;
}

export interface AddManifestItemResult {
  item: Awaited<ReturnType<typeof prisma.manifestItem.create>>;
  capacityWarning?: string;
}

export async function addManifestItem(
  tenantId: string,
  manifestId: string,
  input: AddManifestItemInput,
  userId: string | null
): Promise<AddManifestItemResult> {
  const manifest = await findScopedManifest(tenantId, manifestId);

  if (input.shipmentId) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: input.shipmentId, tenantId },
    });
    if (!shipment) throw new BadRequestError("Shipment not found");
  }

  const trip = await prisma.trip.findFirst({ where: { id: manifest.tripId, tenantId } });

  let capacityWarning: string | undefined;

  if (trip) {
    const existingTotals = await prisma.manifestItem.aggregate({
      where: { manifestId },
      _sum: { weight: true, volume: true },
    });
    const projectedWeight = (existingTotals._sum.weight ?? 0) + (input.weight ?? 0);
    const projectedVolume = (existingTotals._sum.volume ?? 0) + (input.volume ?? 0);

    const checks: Array<{ label: string; projected: number; capacity: number | null }> = [
      { label: "weight", projected: projectedWeight, capacity: trip.vehicleCapacityKg },
      { label: "volume", projected: projectedVolume, capacity: trip.vehicleCapacityM3 },
    ];

    for (const check of checks) {
      if (check.capacity == null || check.capacity <= 0) continue;
      const utilization = check.projected / check.capacity;
      if (utilization > 1) {
        if (!input.override) {
          throw new BadRequestError(
            `Adding this item would exceed vehicle ${check.label} capacity ` +
              `(${check.projected} / ${check.capacity}). Pass override + overrideReason to proceed anyway.`
          );
        }
        if (!input.overrideReason) {
          throw new BadRequestError("overrideReason is required when override is true");
        }
      } else if (utilization > CAPACITY_WARNING_THRESHOLD) {
        capacityWarning = `Manifest is at ${Math.round(utilization * 100)}% of vehicle ${check.label} capacity`;
      }
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.manifestItem.create({
      data: {
        tenantId,
        manifestId,
        shipmentId: input.shipmentId,
        cargoItemId: input.cargoItemId,
        handlingUnitId: input.handlingUnitId,
        itemType: input.itemType ?? "SHIPMENT",
        identifier: input.identifier,
        plannedQuantity: input.plannedQuantity,
        weight: input.weight,
        volume: input.volume,
        notes: input.notes,
        loadingStatus: "PLANNED",
        receivingStatus: "PENDING",
      },
    });

    if (input.override) {
      await recordAudit(tx, {
        tenantId,
        entityType: "Manifest",
        entityId: manifestId,
        action: "CAPACITY_OVERRIDE",
        reason: input.overrideReason,
        isOverride: true,
        afterValue: { itemId: item.id, weight: input.weight, volume: input.volume },
        actorId: userId,
      });
    }

    return item;
  });

  domainEvents.emitTyped("manifest.item_added", {
    manifestId,
    tenantId,
    itemId: created.id,
  });

  return { item: created, capacityWarning };
}

export async function updateManifestItemLoading(
  tenantId: string,
  manifestId: string,
  itemId: string,
  loadingStatus: string,
  expectedVersion: number,
  userId: string | null
) {
  const item = await prisma.manifestItem.findFirst({
    where: { id: itemId, manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const updated = await prisma.$transaction(async (tx) => {
    const versionResult = await tx.manifest.updateMany({
      where: { id: manifestId, version: expectedVersion },
      data: { version: { increment: 1 }, updatedById: userId ?? undefined },
    });
    if (versionResult.count === 0) {
      throw new ConflictError(
        `Manifest was modified by someone else (expected version ${expectedVersion})`
      );
    }

    const result = await tx.manifestItem.update({
      where: { id: itemId },
      data: { loadingStatus: loadingStatus as any },
    });

    const loadedItems = await tx.manifestItem.findMany({
      where: { manifestId, loadingStatus: "LOADED" },
      select: { weight: true, volume: true },
    });
    await tx.manifest.update({
      where: { id: manifestId },
      data: {
        loadedItemCount: loadedItems.length,
        loadedWeight: loadedItems.reduce((sum, i) => sum + (i.weight ?? 0), 0),
        loadedVolume: loadedItems.reduce((sum, i) => sum + (i.volume ?? 0), 0),
      },
    });

    return result;
  });

  if (loadingStatus === "LOADED") {
    domainEvents.emitTyped("manifest.item_loaded", {
      manifestId,
      tenantId,
      itemId,
    });
  }

  return updated;
}

export async function updateManifestItemReceiving(
  tenantId: string,
  manifestId: string,
  itemId: string,
  receivingStatus: string,
  expectedVersion: number,
  userId: string | null
) {
  const item = await prisma.manifestItem.findFirst({
    where: { id: itemId, manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const updated = await prisma.$transaction(async (tx) => {
    const versionResult = await tx.manifest.updateMany({
      where: { id: manifestId, version: expectedVersion },
      data: { version: { increment: 1 }, updatedById: userId ?? undefined },
    });
    if (versionResult.count === 0) {
      throw new ConflictError(
        `Manifest was modified by someone else (expected version ${expectedVersion})`
      );
    }

    return tx.manifestItem.update({
      where: { id: itemId },
      data: { receivingStatus: receivingStatus as any },
    });
  });

  if (receivingStatus === "RECEIVED") {
    domainEvents.emitTyped("manifest.item_received", {
      manifestId,
      tenantId,
      itemId,
    });
  }

  return updated;
}

export async function sealManifest(
  tenantId: string,
  manifestId: string,
  sealNumber: string,
  expectedVersion: number,
  userId: string | null
) {
  const manifest = await findScopedManifest(tenantId, manifestId);

  if (manifest.version !== expectedVersion) {
    throw new ConflictError(
      `Manifest was modified by someone else (expected version ${expectedVersion})`
    );
  }

  if (manifest.status !== "LOADED") {
    throw new BadRequestError("Manifest must be LOADED before sealing");
  }

  const updated = await prisma.manifest.update({
    where: { id: manifestId },
    data: {
      sealNumber,
      sealedAt: new Date(),
      status: "SEALED",
      version: { increment: 1 },
      updatedById: userId ?? undefined,
    },
    include: MANIFEST_INCLUDE,
  });

  domainEvents.emitTyped("manifest.sealed", {
    manifestId,
    tenantId,
    sealNumber,
    tripId: updated.tripId,
  });

  return updated;
}

// Delegates to trips.service.ts's getDispatchChecklist instead of
// maintaining a second, independently-drifting copy of the same readiness
// logic -- this file's own copy previously lacked the mandatory-stop and
// critical-exception checks the trips.service.ts version has.
export const getDispatchChecklist = computeDispatchChecklist;

export async function dispatchTrip(
  tenantId: string,
  tripId: string,
  expectedVersion: number,
  userId: string | null
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, tenantId },
    include: { activeManifest: true, activeRoute: true },
  });

  if (!trip) throw new NotFoundError("Trip not found");

  if (trip.version !== expectedVersion) {
    throw new ConflictError(
      `Trip was modified by someone else (expected version ${expectedVersion})`
    );
  }

  const checklist = await getDispatchChecklist(tenantId, tripId);
  if (!checklist.ready) {
    throw new BadRequestError(`Trip not ready for dispatch: ${checklist.blockers.join("; ")}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const dispatchedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: "DISPATCHED",
        dispatchTime: new Date(),
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
      include: {
        activeManifest: true,
        activeRoute: true,
        originFacility: true,
      },
    });

    if (trip.activeManifest) {
      await tx.manifest.update({
        where: { id: trip.activeManifest.id },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          version: { increment: 1 },
          updatedById: userId ?? undefined,
        },
      });

      await tx.facilityHandover.create({
        data: {
          tenantId,
          tripId,
          manifestId: trip.activeManifest.id,
          handoverType: "ORIGIN_TO_DRIVER",
          facilityId: trip.originFacilityId || "",
          fromActorType: "FACILITY",
          toActorType: "DRIVER",
          toActorId: trip.primaryDriverId || undefined,
          status: "PENDING",
          expectedItemCount: trip.activeManifest.plannedItemCount,
        },
      });
    }

    await tx.tripStatusHistory.create({
      data: {
        tripId,
        status: "DISPATCHED",
        changedById: userId ?? undefined,
      },
    });

    return dispatchedTrip;
  });

  domainEvents.emitTyped("trip.dispatched", {
    tripId,
    tenantId,
  });

  if (trip.activeManifest) {
    domainEvents.emitTyped("manifest.dispatched", {
      manifestId: trip.activeManifest.id,
      tenantId,
      tripId,
    });
  }

  return updated;
}

export async function deleteManifestItem(
  tenantId: string,
  manifestId: string,
  itemId: string
) {
  const manifest = await findScopedManifest(tenantId, manifestId);

  const item = await prisma.manifestItem.findFirst({
    where: { id: itemId, manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  await prisma.manifestItem.delete({
    where: { id: itemId },
  });
}

// Called both from the PATCH /manifests/:id/close endpoint and, inside its
// own transaction, from receivingReconciliation.service.ts's
// completeReconciliation -- callers that already hold a tx pass it via `tx`
// so closing the manifest happens atomically with completing reconciliation.
export async function closeManifestInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  manifestId: string,
  expectedVersion: number,
  userId: string | null
) {
  const manifest = await tx.manifest.findFirst({ where: { id: manifestId, tenantId } });
  if (!manifest) throw new NotFoundError("Manifest not found");

  if (!canTransitionManifestStatus(manifest.status, "CLOSED")) {
    throw new BadRequestError(`Cannot close manifest from status ${manifest.status}`);
  }

  const result = await tx.manifest.updateMany({
    where: { id: manifestId, version: expectedVersion },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      version: { increment: 1 },
      updatedById: userId ?? undefined,
    },
  });
  if (result.count === 0) {
    throw new ConflictError(
      `Manifest was modified by someone else (expected version ${expectedVersion})`
    );
  }

  await recordAudit(tx, {
    tenantId,
    entityType: "Manifest",
    entityId: manifestId,
    action: "MANIFEST_CLOSED",
    beforeValue: { status: manifest.status },
    afterValue: { status: "CLOSED" },
    actorId: userId,
  });
}

export async function closeManifest(
  tenantId: string,
  manifestId: string,
  expectedVersion: number,
  userId: string | null
) {
  await prisma.$transaction(async (tx) => {
    await closeManifestInTx(tx, tenantId, manifestId, expectedVersion, userId);
  });

  const updated = await findScopedManifest(tenantId, manifestId);

  domainEvents.emitTyped("manifest.closed", {
    manifestId,
    tenantId,
    tripId: updated.tripId,
  });

  return updated;
}
