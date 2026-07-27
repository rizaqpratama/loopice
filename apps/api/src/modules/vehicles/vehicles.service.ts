import type { VehicleStatus } from "@loopice/shared";
import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";

export interface ListVehiclesParams {
  search?: string;
  status?: VehicleStatus;
}

export async function listVehicles(tenantId: string, params: ListVehiclesParams) {
  return prisma.vehicle.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { plateNumber: { contains: params.search, mode: "insensitive" } } : {}),
    },
    include: { homeStation: true },
    orderBy: { plateNumber: "asc" },
  });
}

export interface VehicleInput {
  plateNumber: string;
  type: string;
  capacityKg?: number;
  capacityM3?: number;
  capabilities?: string[];
  homeStationId?: string;
  notes?: string;
}

async function assertPlateAvailable(tenantId: string, plateNumber: string, excludeId?: string) {
  const existing = await prisma.vehicle.findUnique({
    where: { tenantId_plateNumber: { tenantId, plateNumber } },
  });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("A vehicle with this plate number already exists in this tenant");
  }
}

async function assertHomeStationInTenant(tenantId: string, stationId: string) {
  const station = await prisma.station.findFirst({ where: { id: stationId, tenantId } });
  if (!station) throw new BadRequestError("Home station does not belong to this tenant");
}

export async function createVehicle(tenantId: string, input: VehicleInput) {
  await assertPlateAvailable(tenantId, input.plateNumber);
  if (input.homeStationId) await assertHomeStationInTenant(tenantId, input.homeStationId);
  return prisma.vehicle.create({
    data: {
      tenantId,
      plateNumber: input.plateNumber,
      type: input.type,
      capacityKg: input.capacityKg,
      capacityM3: input.capacityM3,
      capabilities: input.capabilities ?? [],
      homeStationId: input.homeStationId,
      notes: input.notes,
    },
  });
}

async function findScoped(tenantId: string, id: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, tenantId }, include: { homeStation: true } });
  if (!vehicle) throw new NotFoundError("Vehicle not found");
  return vehicle;
}

export async function getVehicle(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateVehicleInput extends Partial<VehicleInput> {
  status?: VehicleStatus;
}

export async function updateVehicle(tenantId: string, id: string, input: UpdateVehicleInput) {
  await findScoped(tenantId, id);
  if (input.plateNumber) await assertPlateAvailable(tenantId, input.plateNumber, id);
  if (input.homeStationId) await assertHomeStationInTenant(tenantId, input.homeStationId);
  return prisma.vehicle.update({ where: { id }, data: input });
}

export async function deactivateVehicle(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.vehicle.update({ where: { id }, data: { status: "INACTIVE" } });
}
