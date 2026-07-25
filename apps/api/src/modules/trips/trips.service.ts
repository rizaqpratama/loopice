import { canTransitionTripStatus, type TripStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

const TRIP_INCLUDE = {
  route: true,
  driver: true,
  vehicle: true,
  tasks: { orderBy: { sequenceNumber: "asc" as const } },
} satisfies Prisma.TripInclude;

export interface ListTripsParams {
  status?: TripStatus;
  driverId?: string;
  vehicleId?: string;
}

export async function listTrips(tenantId: string, params: ListTripsParams) {
  return prisma.trip.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.driverId ? { driverId: params.driverId } : {}),
      ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
    },
    include: TRIP_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export interface TripInput {
  routeId?: string;
  driverId?: string;
  vehicleId?: string;
  scheduledDate?: string;
  notes?: string;
}

async function assertRouteInTenant(tenantId: string, routeId: string) {
  const route = await prisma.route.findFirst({ where: { id: routeId, tenantId } });
  if (!route) throw new BadRequestError("Route does not belong to this tenant");
}

async function assertDriverInTenant(tenantId: string, driverId: string) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, tenantId } });
  if (!driver) throw new BadRequestError("Driver does not belong to this tenant");
}

async function assertVehicleInTenant(tenantId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } });
  if (!vehicle) throw new BadRequestError("Vehicle does not belong to this tenant");
}

async function generateTripNumber(tenantId: string): Promise<string> {
  const count = await prisma.trip.count({ where: { tenantId } });
  return `TRIP-${String(count + 1).padStart(6, "0")}`;
}

export async function createTrip(tenantId: string, input: TripInput) {
  if (input.routeId) await assertRouteInTenant(tenantId, input.routeId);
  if (input.driverId) await assertDriverInTenant(tenantId, input.driverId);
  if (input.vehicleId) await assertVehicleInTenant(tenantId, input.vehicleId);

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tripNumber = await generateTripNumber(tenantId);
    try {
      return await prisma.trip.create({
        data: {
          tenantId,
          tripNumber,
          routeId: input.routeId,
          driverId: input.driverId,
          vehicleId: input.vehicleId,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
          notes: input.notes,
        },
        include: TRIP_INCLUDE,
      });
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique trip number");
}

async function findScoped(tenantId: string, id: string) {
  const trip = await prisma.trip.findFirst({ where: { id, tenantId }, include: TRIP_INCLUDE });
  if (!trip) throw new NotFoundError("Trip not found");
  return trip;
}

export async function getTrip(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export async function updateTrip(tenantId: string, id: string, input: Partial<TripInput>) {
  await findScoped(tenantId, id);
  if (input.routeId) await assertRouteInTenant(tenantId, input.routeId);
  if (input.driverId) await assertDriverInTenant(tenantId, input.driverId);
  if (input.vehicleId) await assertVehicleInTenant(tenantId, input.vehicleId);
  return prisma.trip.update({
    where: { id },
    data: {
      ...input,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
    },
    include: TRIP_INCLUDE,
  });
}

export async function updateTripStatus(tenantId: string, id: string, status: TripStatus) {
  const trip = await findScoped(tenantId, id);
  if (trip.status !== status && !canTransitionTripStatus(trip.status, status)) {
    throw new BadRequestError(`Cannot transition trip from ${trip.status} to ${status}`);
  }
  return prisma.trip.update({
    where: { id },
    data: {
      status,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    },
    include: TRIP_INCLUDE,
  });
}

export async function addTaskToTrip(tenantId: string, tripId: string, taskId: string) {
  await findScoped(tenantId, tripId);
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) throw new NotFoundError("Task not found");
  await prisma.task.update({ where: { id: taskId }, data: { tripId } });
  return findScoped(tenantId, tripId);
}

export async function removeTaskFromTrip(tenantId: string, tripId: string, taskId: string) {
  await findScoped(tenantId, tripId);
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId, tripId } });
  if (!task) throw new NotFoundError("Task not found on this trip");
  await prisma.task.update({ where: { id: taskId }, data: { tripId: null } });
  return findScoped(tenantId, tripId);
}
