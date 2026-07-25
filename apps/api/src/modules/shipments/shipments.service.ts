import type { ShipmentType } from "@loopice/shared";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/httpError";

export interface ShipmentInput {
  type: ShipmentType;
  quantity?: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  description?: string;
}

async function assertServiceOrderInTenant(tenantId: string, serviceOrderId: string) {
  const serviceOrder = await prisma.serviceOrder.findFirst({
    where: { id: serviceOrderId, tenantId },
  });
  if (!serviceOrder) throw new NotFoundError("Service order not found");
}

export async function createShipment(
  tenantId: string,
  serviceOrderId: string,
  input: ShipmentInput
) {
  await assertServiceOrderInTenant(tenantId, serviceOrderId);
  return prisma.shipment.create({
    data: { tenantId, serviceOrderId, ...input },
  });
}

async function findScoped(tenantId: string, id: string) {
  const shipment = await prisma.shipment.findFirst({ where: { id, tenantId } });
  if (!shipment) throw new NotFoundError("Shipment not found");
  return shipment;
}

export async function updateShipment(
  tenantId: string,
  id: string,
  input: Partial<ShipmentInput>
) {
  await findScoped(tenantId, id);
  return prisma.shipment.update({ where: { id }, data: input });
}

export async function deleteShipment(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  await prisma.shipment.delete({ where: { id } });
}
