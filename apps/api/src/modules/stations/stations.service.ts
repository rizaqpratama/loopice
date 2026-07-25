import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/httpError";

export interface ListStationsParams {
  search?: string;
}

export async function listStations(tenantId: string, params: ListStationsParams) {
  return prisma.station.findMany({
    where: {
      tenantId,
      ...(params.search
        ? {
            OR: [
              { code: { contains: params.search, mode: "insensitive" } },
              { name: { contains: params.search, mode: "insensitive" } },
              { city: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export interface StationInput {
  code: string;
  name: string;
  city: string;
  address?: string;
}

async function assertCodeAvailable(tenantId: string, code: string, excludeId?: string) {
  const existing = await prisma.station.findUnique({ where: { tenantId_code: { tenantId, code } } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("A station with this code already exists in this tenant");
  }
}

export async function createStation(tenantId: string, input: StationInput) {
  await assertCodeAvailable(tenantId, input.code);
  return prisma.station.create({ data: { tenantId, ...input } });
}

async function findScoped(tenantId: string, id: string) {
  const station = await prisma.station.findFirst({ where: { id, tenantId } });
  if (!station) throw new NotFoundError("Station not found");
  return station;
}

export async function getStation(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateStationInput extends Partial<StationInput> {
  isActive?: boolean;
}

export async function updateStation(tenantId: string, id: string, input: UpdateStationInput) {
  await findScoped(tenantId, id);
  if (input.code) await assertCodeAvailable(tenantId, input.code, id);
  return prisma.station.update({ where: { id }, data: input });
}

export async function deactivateStation(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.station.update({ where: { id }, data: { isActive: false } });
}
