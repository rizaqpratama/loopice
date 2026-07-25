import type { DriverStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";

export interface ListDriversParams {
  search?: string;
  status?: DriverStatus;
}

export async function listDrivers(tenantId: string, params: ListDriversParams) {
  return prisma.driver.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
    },
    include: { homeStation: true },
    orderBy: { name: "asc" },
  });
}

export interface DriverInput {
  userId?: string;
  name: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  phone?: string;
  skills?: string[];
  homeStationId?: string;
  notes?: string;
}

async function assertUserInTenant(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new BadRequestError("User does not belong to this tenant");
}

async function assertHomeStationInTenant(tenantId: string, stationId: string) {
  const station = await prisma.station.findFirst({ where: { id: stationId, tenantId } });
  if (!station) throw new BadRequestError("Home station does not belong to this tenant");
}

export async function createDriver(tenantId: string, input: DriverInput) {
  if (input.userId) await assertUserInTenant(tenantId, input.userId);
  if (input.homeStationId) await assertHomeStationInTenant(tenantId, input.homeStationId);
  try {
    return await prisma.driver.create({
      data: {
        tenantId,
        userId: input.userId,
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : undefined,
        phone: input.phone,
        skills: input.skills ?? [],
        homeStationId: input.homeStationId,
        notes: input.notes,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("This user is already linked to a driver in this tenant");
    }
    throw err;
  }
}

async function findScoped(tenantId: string, id: string) {
  const driver = await prisma.driver.findFirst({ where: { id, tenantId }, include: { homeStation: true } });
  if (!driver) throw new NotFoundError("Driver not found");
  return driver;
}

export async function getDriver(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateDriverInput extends Partial<DriverInput> {
  status?: DriverStatus;
}

export async function updateDriver(tenantId: string, id: string, input: UpdateDriverInput) {
  await findScoped(tenantId, id);
  if (input.userId) await assertUserInTenant(tenantId, input.userId);
  if (input.homeStationId) await assertHomeStationInTenant(tenantId, input.homeStationId);
  try {
    return await prisma.driver.update({
      where: { id },
      data: {
        ...input,
        licenseExpiry: input.licenseExpiry ? new Date(input.licenseExpiry) : undefined,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("This user is already linked to a driver in this tenant");
    }
    throw err;
  }
}

export async function deactivateDriver(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.driver.update({ where: { id }, data: { status: "INACTIVE" } });
}
