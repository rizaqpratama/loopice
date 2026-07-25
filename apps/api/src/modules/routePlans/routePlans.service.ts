import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

const ROUTE_INCLUDE = {
  stops: { include: { facility: true }, orderBy: { sequenceNumber: "asc" as const } },
} satisfies Prisma.RouteInclude;

export async function listRoutes(tenantId: string, search?: string) {
  return prisma.route.findMany({
    where: {
      tenantId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: ROUTE_INCLUDE,
    orderBy: { name: "asc" },
  });
}

export interface RouteInput {
  name: string;
  code?: string;
  description?: string;
  isTemplate?: boolean;
}

export async function createRoute(tenantId: string, input: RouteInput) {
  return prisma.route.create({ data: { tenantId, ...input }, include: ROUTE_INCLUDE });
}

async function findScoped(tenantId: string, id: string) {
  const route = await prisma.route.findFirst({ where: { id, tenantId }, include: ROUTE_INCLUDE });
  if (!route) throw new NotFoundError("Route not found");
  return route;
}

export async function getRoute(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateRouteInput extends Partial<RouteInput> {
  isActive?: boolean;
}

export async function updateRoute(tenantId: string, id: string, input: UpdateRouteInput) {
  await findScoped(tenantId, id);
  return prisma.route.update({ where: { id }, data: input, include: ROUTE_INCLUDE });
}

export async function deactivateRoute(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.route.update({ where: { id }, data: { isActive: false }, include: ROUTE_INCLUDE });
}

export interface RouteStopInput {
  facilityId?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

async function assertFacilityInTenant(tenantId: string, facilityId: string) {
  const facility = await prisma.station.findFirst({ where: { id: facilityId, tenantId } });
  if (!facility) throw new BadRequestError("Facility does not belong to this tenant");
}

async function nextStopSequence(routeId: string): Promise<number> {
  const count = await prisma.routeStop.count({ where: { routeId } });
  return count + 1;
}

export async function createRouteStop(tenantId: string, routeId: string, input: RouteStopInput) {
  await findScoped(tenantId, routeId);
  if (input.facilityId) await assertFacilityInTenant(tenantId, input.facilityId);

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sequenceNumber = await nextStopSequence(routeId);
    try {
      await prisma.routeStop.create({ data: { tenantId, routeId, sequenceNumber, ...input } });
      return findScoped(tenantId, routeId);
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique stop sequence");
}

export async function deleteRouteStop(tenantId: string, id: string) {
  const stop = await prisma.routeStop.findFirst({ where: { id, tenantId } });
  if (!stop) throw new NotFoundError("Route stop not found");
  const linkedTasks = await prisma.task.count({ where: { stopId: id } });
  if (linkedTasks > 0) {
    throw new BadRequestError("Cannot remove a stop that has tasks linked to it");
  }
  await prisma.routeStop.delete({ where: { id } });
}

// Reorders Task.sequenceNumber for the tasks on this route (not the stop
// order) -- the dispatcher's ordering of stops-to-visit for that route's
// current task set.
export async function reorderTaskSequence(tenantId: string, routeId: string, taskIds: string[]) {
  await findScoped(tenantId, routeId);
  const tasks = await prisma.task.findMany({ where: { id: { in: taskIds }, tenantId, routeId } });
  if (tasks.length !== taskIds.length) {
    throw new BadRequestError("One or more tasks do not belong to this route");
  }
  await prisma.$transaction(
    taskIds.map((taskId, index) =>
      prisma.task.update({ where: { id: taskId }, data: { sequenceNumber: index + 1 } })
    )
  );
  return prisma.task.findMany({ where: { routeId, tenantId }, orderBy: { sequenceNumber: "asc" } });
}
