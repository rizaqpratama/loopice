import { canTransitionShipmentLegStatus, type ShipmentLegStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

const LEG_INCLUDE = {
  originStation: true,
  destStation: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
} satisfies Prisma.ShipmentLegInclude;

async function assertServiceOrderInTenant(tenantId: string, serviceOrderId: string) {
  const serviceOrder = await prisma.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
  });
  if (!serviceOrder) throw new NotFoundError("Service order not found");
}

async function assertStationInTenant(tenantId: string, stationId: string, field: string) {
  const station = await prisma.station.findFirst({ where: { id: stationId, tenantId } });
  if (!station) throw new BadRequestError(`${field} station does not belong to this tenant`);
}

async function nextLegSequence(serviceOrderId: string): Promise<number> {
  const count = await prisma.shipmentLeg.count({ where: { serviceOrderId } });
  return count + 1;
}

export interface CreateLegInput {
  originStationId: string;
  destStationId: string;
  notes?: string;
}

export async function createShipmentLeg(
  tenantId: string,
  serviceOrderId: string,
  createdById: string | null,
  input: CreateLegInput
) {
  await assertServiceOrderInTenant(tenantId, serviceOrderId);
  await assertStationInTenant(tenantId, input.originStationId, "Origin");
  await assertStationInTenant(tenantId, input.destStationId, "Destination");

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const legSequence = await nextLegSequence(serviceOrderId);
    try {
      return await prisma.$transaction(async (tx) => {
        const leg = await tx.shipmentLeg.create({
          data: {
            tenantId,
            serviceOrderId,
            legSequence,
            originStationId: input.originStationId,
            destStationId: input.destStationId,
            notes: input.notes,
            status: "PLANNED",
          },
        });
        await tx.shipmentLegStatusHistory.create({
          data: { shipmentLegId: leg.id, status: "PLANNED", changedById: createdById ?? undefined },
        });
        // Re-fetch with the include so the just-created status history row
        // (inserted after `leg` above) is present in the response.
        return tx.shipmentLeg.findUniqueOrThrow({ where: { id: leg.id }, include: LEG_INCLUDE });
      });
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique leg sequence");
}

async function findScoped(tenantId: string, id: string) {
  const leg = await prisma.shipmentLeg.findFirst({ where: { id, tenantId }, include: LEG_INCLUDE });
  if (!leg) throw new NotFoundError("Shipment leg not found");
  return leg;
}

export async function updateShipmentLegStatus(
  tenantId: string,
  id: string,
  status: ShipmentLegStatus,
  note: string | undefined,
  changedById: string | null
) {
  const leg = await findScoped(tenantId, id);

  if (leg.status !== status && !canTransitionShipmentLegStatus(leg.status, status)) {
    throw new BadRequestError(`Cannot transition shipment leg from ${leg.status} to ${status}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.shipmentLeg.update({ where: { id }, data: { status } });
    await tx.shipmentLegStatusHistory.create({
      data: { shipmentLegId: id, status, note, changedById: changedById ?? undefined },
    });
    // Re-fetch with the include so the just-created status history row is present.
    return tx.shipmentLeg.findUniqueOrThrow({ where: { id }, include: LEG_INCLUDE });
  });
}

export async function deleteShipmentLeg(tenantId: string, id: string) {
  const leg = await findScoped(tenantId, id);
  if (leg.status !== "PLANNED") {
    throw new BadRequestError("Only a planned leg can be removed");
  }
  await prisma.shipmentLegStatusHistory.deleteMany({ where: { shipmentLegId: id } });
  await prisma.shipmentLeg.delete({ where: { id } });
}
