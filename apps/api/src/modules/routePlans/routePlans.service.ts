import {
  canTransitionRouteStatus,
  canTransitionRouteStopStatus,
  type RouteStatus,
  type RouteSource,
  type RouteStopType,
  type RouteStopStatus,
  type RouteStopTaskAssignmentStatus,
} from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";

const ROUTE_INCLUDE = {
  stops: { orderBy: { sequenceNumber: "asc" } },
  trip: true,
  previousRouteVersion: true,
  nextRouteVersion: true,
  startFacility: true,
  endFacility: true,
} satisfies Prisma.RouteInclude;

const ROUTE_STOP_INCLUDE = {
  facility: true,
  tasks: true,
  routeStopTasks: { include: { task: true }, orderBy: { executionSequence: "asc" } },
} satisfies Prisma.RouteStopInclude;

async function generateRouteNumber(tenantId: string): Promise<string> {
  const count = await prisma.route.count({ where: { tenantId } });
  return `ROUTE-${String(count + 1).padStart(6, "0")}`;
}

async function findScopedRoute(tenantId: string, id: string) {
  const route = await prisma.route.findFirst({
    where: { id, tenantId },
    include: ROUTE_INCLUDE,
  });
  if (!route) throw new NotFoundError("Route not found");
  return route;
}

async function findScopedStop(tenantId: string, stopId: string) {
  const stop = await prisma.routeStop.findFirst({
    where: { id: stopId, tenantId },
    include: ROUTE_STOP_INCLUDE,
  });
  if (!stop) throw new NotFoundError("Route stop not found");
  return stop;
}

export interface CreateRouteInput {
  name: string;
  code?: string;
  description?: string;
  tripId?: string;
  isTemplate?: boolean;
  startLocationId?: string;
  endLocationId?: string;
}

export async function createRoute(tenantId: string, input: CreateRouteInput, userId: string | null) {
  if (input.tripId) {
    const trip = await prisma.trip.findFirst({
      where: { id: input.tripId, tenantId },
    });
    if (!trip) throw new BadRequestError("Trip not found");
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const routeNumber = await generateRouteNumber(tenantId);
    try {
      const created = await prisma.route.create({
        data: {
          tenantId,
          routeNumber,
          name: input.name,
          code: input.code,
          description: input.description,
          tripId: input.tripId,
          isTemplate: input.isTemplate ?? false,
          status: "DRAFT",
          source: "MANUAL",
          version: 1,
          startLocationId: input.startLocationId,
          endLocationId: input.endLocationId,
          createdById: userId ?? undefined,
        },
        include: ROUTE_INCLUDE,
      });

      domainEvents.emitTyped("route.created", {
        routeId: created.id,
        tenantId,
        routeNumber: created.routeNumber,
      });

      return created;
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate unique route number");
}

export async function getRoute(tenantId: string, id: string) {
  return findScopedRoute(tenantId, id);
}

export interface ListRoutesParams {
  status?: RouteStatus;
  tripId?: string;
  isTemplate?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

export async function listRoutes(tenantId: string, params: ListRoutesParams) {
  return prisma.route.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.isTemplate !== undefined ? { isTemplate: params.isTemplate } : {}),
      ...(params.search ? { name: { contains: params.search, mode: "insensitive" } } : {}),
    },
    include: ROUTE_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: params.skip ?? 0,
    take: params.take ?? 50,
  });
}

export interface UpdateRouteInput {
  name?: string;
  code?: string;
  description?: string;
  isTemplate?: boolean;
}

export async function updateRoute(
  tenantId: string,
  id: string,
  input: UpdateRouteInput,
  expectedVersion: number,
  userId: string | null
) {
  const route = await findScopedRoute(tenantId, id);

  if (route.version !== expectedVersion) {
    throw new ConflictError(
      `Route was modified by someone else (expected version ${expectedVersion})`
    );
  }

  const updated = await prisma.route.update({
    where: { id },
    data: {
      ...input,
      version: { increment: 1 },
      updatedById: userId ?? undefined,
    },
    include: ROUTE_INCLUDE,
  });

  return updated;
}

export async function updateRouteStatus(
  tenantId: string,
  id: string,
  newStatus: RouteStatus,
  userId: string | null
) {
  const route = await findScopedRoute(tenantId, id);

  if (!canTransitionRouteStatus(route.status, newStatus)) {
    throw new BadRequestError(`Cannot transition route from ${route.status} to ${newStatus}`);
  }

  const updated = await prisma.route.update({
    where: { id },
    data: {
      status: newStatus,
      updatedById: userId ?? undefined,
    },
    include: ROUTE_INCLUDE,
  });

  if (newStatus === "ACTIVE" && route.tripId) {
    domainEvents.emitTyped("route.activated", {
      routeId: id,
      tenantId,
      tripId: route.tripId,
    });
  }

  return updated;
}

export interface CreateRouteVersionInput {
  changeReason?: string;
}

export async function createRouteVersion(
  tenantId: string,
  routeId: string,
  input: CreateRouteVersionInput,
  userId: string | null
) {
  const originalRoute = await findScopedRoute(tenantId, routeId);

  const newVersion = await prisma.$transaction(async (tx) => {
    const versionedRoute = await tx.route.create({
      data: {
        tenantId,
        routeNumber: originalRoute.routeNumber,
        name: originalRoute.name,
        code: originalRoute.code,
        description: originalRoute.description,
        tripId: originalRoute.tripId,
        status: "DRAFT",
        source: "RECALCULATED",
        version: originalRoute.version + 1,
        previousRouteVersionId: originalRoute.id,
        changeReason: input.changeReason,
        startLocationId: originalRoute.startLocationId,
        endLocationId: originalRoute.endLocationId,
        createdById: userId ?? undefined,
      },
      include: ROUTE_INCLUDE,
    });

    for (const stop of originalRoute.stops) {
      await tx.routeStop.create({
        data: {
          tenantId,
          routeId: versionedRoute.id,
          sequenceNumber: stop.sequenceNumber,
          stopType: stop.stopType,
          status: "PLANNED",
          isMandatory: stop.isMandatory,
          facilityId: stop.facilityId,
          locationName: stop.locationName,
          address: stop.address,
          latitude: stop.latitude,
          longitude: stop.longitude,
          contactName: stop.contactName,
          contactPhone: stop.contactPhone,
          plannedArrivalTime: stop.plannedArrivalTime,
          plannedDepartureTime: stop.plannedDepartureTime,
          estimatedServiceDurationMinutes: stop.estimatedServiceDurationMinutes,
          timeWindowStart: stop.timeWindowStart,
          timeWindowEnd: stop.timeWindowEnd,
          accessNotes: stop.accessNotes,
          instructions: stop.instructions,
          notes: stop.notes,
        },
      });
    }

    return versionedRoute;
  });

  domainEvents.emitTyped("route.created", {
    routeId: newVersion.id,
    tenantId,
    routeNumber: newVersion.routeNumber,
  });

  return newVersion;
}

export async function activateRouteVersion(
  tenantId: string,
  routeId: string,
  userId: string | null
) {
  const newActiveRoute = await findScopedRoute(tenantId, routeId);

  if (newActiveRoute.tripId) {
    await prisma.route.updateMany({
      where: {
        tenantId,
        tripId: newActiveRoute.tripId,
        status: "ACTIVE",
      },
      data: {
        status: "SUPERSEDED",
      },
    });
  }

  const activated = await prisma.route.update({
    where: { id: routeId },
    data: {
      status: "ACTIVE",
      updatedById: userId ?? undefined,
    },
    include: ROUTE_INCLUDE,
  });

  domainEvents.emitTyped("route.activated", {
    routeId,
    tenantId,
    tripId: newActiveRoute.tripId ?? undefined,
  });

  return activated;
}

export interface CreateRouteStopInput {
  stopType?: RouteStopType;
  sequenceNumber: number;
  facilityId?: string;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  plannedArrivalTime?: string;
  plannedDepartureTime?: string;
  estimatedServiceDurationMinutes?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  accessNotes?: string;
  instructions?: string;
  notes?: string;
  isMandatory?: boolean;
  sourceTaskId?: string;
}

export async function addRouteStop(
  tenantId: string,
  routeId: string,
  input: CreateRouteStopInput,
  userId: string | null
) {
  const route = await findScopedRoute(tenantId, routeId);

  if (input.facilityId) {
    const facility = await prisma.station.findFirst({
      where: { id: input.facilityId, tenantId },
    });
    if (!facility) throw new BadRequestError("Facility not found");
  }

  const existingStopAtSequence = await prisma.routeStop.findFirst({
    where: {
      routeId,
      sequenceNumber: input.sequenceNumber,
    },
  });

  if (existingStopAtSequence) {
    await prisma.routeStop.updateMany({
      where: {
        routeId,
        sequenceNumber: { gte: input.sequenceNumber },
      },
      data: {
        sequenceNumber: { increment: 1 },
      },
    });
  }

  const created = await prisma.routeStop.create({
    data: {
      tenantId,
      routeId,
      stopType: input.stopType ?? "OTHER",
      sequenceNumber: input.sequenceNumber,
      isMandatory: input.isMandatory ?? true,
      status: "PLANNED",
      facilityId: input.facilityId,
      locationName: input.locationName,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      plannedArrivalTime: input.plannedArrivalTime
        ? new Date(input.plannedArrivalTime)
        : undefined,
      plannedDepartureTime: input.plannedDepartureTime
        ? new Date(input.plannedDepartureTime)
        : undefined,
      estimatedServiceDurationMinutes: input.estimatedServiceDurationMinutes,
      timeWindowStart: input.timeWindowStart ? new Date(input.timeWindowStart) : undefined,
      timeWindowEnd: input.timeWindowEnd ? new Date(input.timeWindowEnd) : undefined,
      accessNotes: input.accessNotes,
      instructions: input.instructions,
      notes: input.notes,
    },
    include: ROUTE_STOP_INCLUDE,
  });

  if (input.sourceTaskId) {
    const task = await prisma.task.findFirst({
      where: { id: input.sourceTaskId, tenantId },
    });
    if (task) {
      await prisma.routeStopTask.create({
        data: {
          tenantId,
          routeStopId: created.id,
          taskId: input.sourceTaskId,
          assignmentStatus: "ASSIGNED",
          createdById: userId ?? undefined,
        },
      });

      await prisma.task.update({
        where: { id: input.sourceTaskId },
        data: {
          stopId: created.id,
        },
      });
    }
  }

  return created;
}

export async function getRouteStop(tenantId: string, stopId: string) {
  return findScopedStop(tenantId, stopId);
}

export interface UpdateRouteStopInput {
  stopType?: RouteStopType;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  plannedArrivalTime?: string;
  plannedDepartureTime?: string;
  estimatedServiceDurationMinutes?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  accessNotes?: string;
  instructions?: string;
  notes?: string;
  isMandatory?: boolean;
}

export async function updateRouteStop(
  tenantId: string,
  stopId: string,
  input: UpdateRouteStopInput,
  userId: string | null
) {
  await findScopedStop(tenantId, stopId);

  const updated = await prisma.routeStop.update({
    where: { id: stopId },
    data: {
      stopType: input.stopType,
      locationName: input.locationName,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      plannedArrivalTime: input.plannedArrivalTime
        ? new Date(input.plannedArrivalTime)
        : undefined,
      plannedDepartureTime: input.plannedDepartureTime
        ? new Date(input.plannedDepartureTime)
        : undefined,
      estimatedServiceDurationMinutes: input.estimatedServiceDurationMinutes,
      timeWindowStart: input.timeWindowStart ? new Date(input.timeWindowStart) : undefined,
      timeWindowEnd: input.timeWindowEnd ? new Date(input.timeWindowEnd) : undefined,
      accessNotes: input.accessNotes,
      instructions: input.instructions,
      notes: input.notes,
      isMandatory: input.isMandatory,
      updatedAt: new Date(),
    },
    include: ROUTE_STOP_INCLUDE,
  });

  return updated;
}

export async function updateRouteStopStatus(
  tenantId: string,
  stopId: string,
  newStatus: RouteStopStatus,
  userId: string | null
) {
  const stop = await findScopedStop(tenantId, stopId);

  if (!canTransitionRouteStopStatus(stop.status, newStatus)) {
    throw new BadRequestError(`Cannot transition stop from ${stop.status} to ${newStatus}`);
  }

  const updated = await prisma.routeStop.update({
    where: { id: stopId },
    data: {
      status: newStatus,
      ...(newStatus === "ARRIVED" && { actualArrivalTime: new Date() }),
      ...(newStatus === "IN_PROGRESS" && { actualServiceStartTime: new Date() }),
      ...(newStatus === "COMPLETED" && { actualDepartureTime: new Date() }),
      updatedAt: new Date(),
    },
    include: ROUTE_STOP_INCLUDE,
  });

  return updated;
}

export interface ReorderRouteStopsInput {
  stopIds: string[];
}

export async function reorderRouteStops(
  tenantId: string,
  routeId: string,
  input: ReorderRouteStopsInput,
  userId: string | null
) {
  const route = await findScopedRoute(tenantId, routeId);

  const stops = await prisma.routeStop.findMany({
    where: { routeId, tenantId },
  });

  const stopMap = new Map(stops.map((s) => [s.id, s]));
  const stopIdSet = new Set(input.stopIds);

  if (stopIdSet.size !== stops.length || stops.some((s) => !stopIdSet.has(s.id))) {
    throw new BadRequestError("Stop IDs do not match route stops");
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < input.stopIds.length; i++) {
      await tx.routeStop.update({
        where: { id: input.stopIds[i] },
        data: { sequenceNumber: i + 1 },
      });
    }
  });

  domainEvents.emitTyped("route.resequenced", {
    routeId,
    tenantId,
  });

  return findScopedRoute(tenantId, routeId);
}

export async function deleteRouteStop(tenantId: string, stopId: string, userId: string | null) {
  const stop = await findScopedStop(tenantId, stopId);
  const routeId = stop.routeId;

  await prisma.$transaction(async (tx) => {
    await tx.routeStopTask.deleteMany({
      where: { routeStopId: stopId },
    });

    await tx.routeStop.delete({
      where: { id: stopId },
    });

    const remainingStops = await tx.routeStop.findMany({
      where: { routeId },
      orderBy: { sequenceNumber: "asc" },
    });

    for (let i = 0; i < remainingStops.length; i++) {
      await tx.routeStop.update({
        where: { id: remainingStops[i].id },
        data: { sequenceNumber: i + 1 },
      });
    }
  });

  return findScopedRoute(tenantId, routeId);
}

export async function linkTaskToStop(
  tenantId: string,
  stopId: string,
  taskId: string,
  userId: string | null
) {
  const stop = await findScopedStop(tenantId, stopId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });

  if (!task) throw new NotFoundError("Task not found");

  const existingLink = await prisma.routeStopTask.findFirst({
    where: {
      taskId,
      assignmentStatus: { in: ["PLANNED", "ASSIGNED"] as RouteStopTaskAssignmentStatus[] },
    },
  });

  if (existingLink) {
    throw new BadRequestError("Task is already linked to another stop");
  }

  const created = await prisma.routeStopTask.create({
    data: {
      tenantId,
      routeStopId: stopId,
      taskId,
      assignmentStatus: "ASSIGNED",
      assignedAt: new Date(),
      createdById: userId ?? undefined,
    },
    include: { task: true },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      stopId,
    },
  });

  return created;
}

export async function unlinkTaskFromStop(
  tenantId: string,
  stopId: string,
  taskId: string,
  userId: string | null
) {
  const link = await prisma.routeStopTask.findFirst({
    where: {
      routeStopId: stopId,
      taskId,
    },
  });

  if (!link) throw new NotFoundError("Task is not linked to this stop");

  await prisma.routeStopTask.delete({
    where: { id: link.id },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      stopId: null,
    },
  });

  return findScopedStop(tenantId, stopId);
}

export async function getRouteVersions(tenantId: string, routeId: string) {
  const route = await findScopedRoute(tenantId, routeId);

  const versions: typeof route[] = [];
  let current: typeof route | null = route;

  while (current) {
    versions.unshift(current);
    if (current.previousRouteVersionId) {
      current = await prisma.route.findFirst({
        where: { id: current.previousRouteVersionId },
        include: ROUTE_INCLUDE,
      });
    } else {
      current = null;
    }
  }

  return versions;
}

export type CompareRoutesResult = {
  fromVersion: Prisma.RouteGetPayload<{ include: typeof ROUTE_INCLUDE }>;
  toVersion: Prisma.RouteGetPayload<{ include: typeof ROUTE_INCLUDE }>;
  fromStops: Prisma.RouteStopGetPayload<{ include: typeof ROUTE_STOP_INCLUDE }>[];
  toStops: Prisma.RouteStopGetPayload<{ include: typeof ROUTE_STOP_INCLUDE }>[];
};

export async function compareRoutes(
  tenantId: string,
  fromRouteId: string,
  toRouteId: string
): Promise<CompareRoutesResult> {
  const fromRoute = await findScopedRoute(tenantId, fromRouteId);
  const toRoute = await findScopedRoute(tenantId, toRouteId);

  const fromStops = await prisma.routeStop.findMany({
    where: { routeId: fromRouteId },
    include: ROUTE_STOP_INCLUDE,
    orderBy: { sequenceNumber: "asc" },
  });

  const toStops = await prisma.routeStop.findMany({
    where: { routeId: toRouteId },
    include: ROUTE_STOP_INCLUDE,
    orderBy: { sequenceNumber: "asc" },
  });

  return {
    fromVersion: fromRoute,
    toVersion: toRoute,
    fromStops,
    toStops,
  };
}
