import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { recordAudit } from "../../lib/auditLog";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/httpError";

const HANDOVER_INCLUDE = {
  facility: true,
  trip: true,
  manifest: true,
} satisfies Prisma.FacilityHandoverInclude;

async function findScopedHandover(tenantId: string, id: string) {
  const handover = await prisma.facilityHandover.findFirst({
    where: { id, tenantId },
    include: HANDOVER_INCLUDE,
  });
  if (!handover) throw new NotFoundError("Facility handover not found");
  return handover;
}

export interface CreateHandoverInput {
  tripId: string;
  manifestId: string;
  handoverType: "ORIGIN_TO_DRIVER" | "DRIVER_TO_DESTINATION" | "FACILITY_TO_PARTNER" | "PARTNER_TO_FACILITY" | "OTHER";
  facilityId: string;
  fromActorType: "FACILITY" | "DRIVER" | "PARTNER" | "SYSTEM";
  fromActorId?: string;
  toActorType: "FACILITY" | "DRIVER" | "PARTNER" | "SYSTEM";
  toActorId?: string;
  expectedItemCount?: number;
  sealNumber?: string;
  sealCondition?: string;
  notes?: string;
}

export async function createHandover(
  tenantId: string,
  input: CreateHandoverInput,
  userId: string | null
) {
  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, tenantId },
  });
  if (!trip) throw new BadRequestError("Trip not found");

  const manifest = await prisma.manifest.findFirst({
    where: { id: input.manifestId, tenantId, tripId: input.tripId },
  });
  if (!manifest) throw new BadRequestError("Manifest not found for this trip");

  const facility = await prisma.station.findFirst({
    where: { id: input.facilityId, tenantId },
  });
  if (!facility) throw new BadRequestError("Facility not found");

  const created = await prisma.$transaction(async (tx) => {
    const handover = await tx.facilityHandover.create({
      data: {
        tenantId,
        tripId: input.tripId,
        manifestId: input.manifestId,
        handoverType: input.handoverType,
        facilityId: input.facilityId,
        fromActorType: input.fromActorType,
        fromActorId: input.fromActorId,
        toActorType: input.toActorType,
        toActorId: input.toActorId,
        status: "PENDING",
        expectedItemCount: input.expectedItemCount,
        sealNumber: input.sealNumber,
        sealCondition: input.sealCondition,
        notes: input.notes,
        createdById: userId ?? undefined,
        version: 1,
      },
      include: HANDOVER_INCLUDE,
    });

    await recordAudit(tx, {
      tenantId,
      entityType: "FacilityHandover",
      entityId: handover.id,
      action: "HANDOVER_CREATED",
      afterValue: { handoverType: input.handoverType, status: "PENDING" },
      actorId: userId,
    });

    return handover;
  });

  return created;
}

export async function getHandover(tenantId: string, id: string) {
  return findScopedHandover(tenantId, id);
}

export interface ListHandoversParams {
  tripId?: string;
  manifestId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

export async function listHandovers(tenantId: string, params: ListHandoversParams) {
  return prisma.facilityHandover.findMany({
    where: {
      tenantId,
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.manifestId ? { manifestId: params.manifestId } : {}),
      ...(params.status ? { status: params.status as any } : {}),
    },
    include: HANDOVER_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: params.skip ?? 0,
    take: params.take ?? 50,
  });
}

export interface AcceptHandoverInput {
  acceptedWithException?: boolean;
  actualItemCount?: number;
  notes?: string;
}

export async function acceptHandover(
  tenantId: string,
  handoverId: string,
  input: AcceptHandoverInput,
  expectedVersion: number,
  userRole?: string,
  userId?: string
) {
  const handover = await findScopedHandover(tenantId, handoverId);

  if (handover.status !== "PENDING") {
    throw new BadRequestError("Handover must be in PENDING status to accept");
  }

  // Direction validation: DRIVER can only accept ORIGIN_TO_DRIVER handovers
  // on their own trip; conversely, ORIGIN_TO_DRIVER handovers can only be
  // accepted by the assigned driver, not by staff roles (DISPATCHER,
  // WAREHOUSE_STAFF, etc.) that also carry WRITE access to this endpoint.
  // This can't fully verify facility membership for staff roles accepting
  // DRIVER_TO_DESTINATION/FACILITY_TO_PARTNER/PARTNER_TO_FACILITY handovers
  // -- User has no facility/station link on this schema -- but it closes
  // the direction mismatch, which is checkable today.
  if (userRole === "DRIVER") {
    if (handover.handoverType !== "ORIGIN_TO_DRIVER") {
      throw new ForbiddenError("Drivers can only accept origin handovers");
    }
    if (handover.toActorId !== userId) {
      throw new ForbiddenError("You can only accept handovers assigned to you");
    }
  } else if (handover.handoverType === "ORIGIN_TO_DRIVER") {
    throw new ForbiddenError("Only the assigned driver can accept an origin handover");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.facilityHandover.updateMany({
      where: { id: handoverId, version: expectedVersion },
      data: {
        status: input.acceptedWithException ? "ACCEPTED_WITH_EXCEPTION" : "ACCEPTED",
        actualItemCount: input.actualItemCount,
        notes: input.notes,
        acceptedTime: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Handover was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await recordAudit(tx, {
      tenantId,
      entityType: "FacilityHandover",
      entityId: handoverId,
      action: "HANDOVER_ACCEPTED",
      beforeValue: { status: handover.status },
      afterValue: { status: input.acceptedWithException ? "ACCEPTED_WITH_EXCEPTION" : "ACCEPTED" },
      actorId: userId ?? null,
    });
  });

  const updated = await findScopedHandover(tenantId, handoverId);

  const eventType = handover.handoverType === "ORIGIN_TO_DRIVER"
    ? "handover.origin_accepted"
    : "handover.destination_accepted";

  domainEvents.emitTyped(eventType as any, {
    handoverId,
    tripId: handover.tripId,
    manifestId: handover.manifestId,
    tenantId,
    acceptedByActorType: handover.toActorType,
    acceptedByActorId: handover.toActorId,
  });

  return updated;
}

export async function rejectHandover(
  tenantId: string,
  handoverId: string,
  expectedVersion: number,
  userId: string | null
) {
  const handover = await findScopedHandover(tenantId, handoverId);

  if (handover.status !== "PENDING") {
    throw new BadRequestError("Handover must be in PENDING status to reject");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.facilityHandover.updateMany({
      where: { id: handoverId, version: expectedVersion },
      data: {
        status: "REJECTED",
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Handover was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await recordAudit(tx, {
      tenantId,
      entityType: "FacilityHandover",
      entityId: handoverId,
      action: "HANDOVER_REJECTED",
      beforeValue: { status: handover.status },
      afterValue: { status: "REJECTED" },
      actorId: userId,
    });
  });

  return findScopedHandover(tenantId, handoverId);
}
