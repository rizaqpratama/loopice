import {
  canTransitionManifestStatus,
  type ManifestStatus,
  type ManifestItemType,
} from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";
import { getDispatchChecklist as computeDispatchChecklist } from "../trips/trips.service";

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
}

export async function addManifestItem(
  tenantId: string,
  manifestId: string,
  input: AddManifestItemInput,
  userId: string | null
) {
  const manifest = await findScopedManifest(tenantId, manifestId);

  if (input.shipmentId) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: input.shipmentId, tenantId },
    });
    if (!shipment) throw new BadRequestError("Shipment not found");
  }

  const created = await prisma.manifestItem.create({
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

  domainEvents.emitTyped("manifest.item_added", {
    manifestId,
    tenantId,
    itemId: created.id,
  });

  return created;
}

export async function updateManifestItemLoading(
  tenantId: string,
  manifestId: string,
  itemId: string,
  loadingStatus: string,
  expectedVersion: number,
  userId: string | null
) {
  const manifest = await findScopedManifest(tenantId, manifestId);

  if (manifest.version !== expectedVersion) {
    throw new ConflictError(
      `Manifest was modified by someone else (expected version ${expectedVersion})`
    );
  }

  const item = await prisma.manifestItem.findFirst({
    where: { id: itemId, manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const updated = await prisma.manifestItem.update({
    where: { id: itemId },
    data: { loadingStatus: loadingStatus as any },
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
  const manifest = await findScopedManifest(tenantId, manifestId);

  if (manifest.version !== expectedVersion) {
    throw new ConflictError(
      `Manifest was modified by someone else (expected version ${expectedVersion})`
    );
  }

  const item = await prisma.manifestItem.findFirst({
    where: { id: itemId, manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const updated = await prisma.manifestItem.update({
    where: { id: itemId },
    data: { receivingStatus: receivingStatus as any },
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
