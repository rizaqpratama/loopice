import {
  canTransitionTripStatus,
  type TripStatus,
  type TripType,
  type TransferType,
} from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { recordAudit } from "../../lib/auditLog";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/httpError";
import { SAFE_USER_SELECT } from "../../lib/safeUserSelect";
import type { UserRole } from "@loopice/shared";

const TRIP_INCLUDE = {
  vehicle: true,
  primaryDriver: true,
  secondaryDrivers: { include: { driver: true } },
  activeRoute: { include: { stops: { orderBy: { sequenceNumber: "asc" } } } },
  activeManifest: { include: { items: true } },
  originFacility: true,
  destinationFacility: true,
  tasks: { orderBy: { sequenceNumber: "asc" } },
  statusHistory: { orderBy: { changedAt: "desc" } },
  handovers: true,
  exceptions: true,
} satisfies Prisma.TripInclude;

interface FindOwnDriverResult {
  driverId: string;
}

async function findOwnDriverId(tenantId: string, userId: string): Promise<string | null> {
  const driver = await prisma.driver.findFirst({
    where: { tenantId, userId },
    select: { id: true },
  });
  return driver?.id ?? null;
}

export async function assertOwnsTripOrPrivileged(
  tenantId: string,
  actorUserId: string | null,
  actorRole: UserRole,
  trip: { primaryDriverId: string | null }
): Promise<void> {
  if (actorRole !== "DRIVER") return;
  if (!actorUserId) {
    throw new ForbiddenError("You may only access your own trips");
  }

  const driverId = await findOwnDriverId(tenantId, actorUserId);
  if (!driverId || trip.primaryDriverId !== driverId) {
    throw new ForbiddenError("You may only access your own trips");
  }
}

async function replayIfIdempotent(
  tenantId: string,
  tripId: string,
  clientRequestId: string | undefined
) {
  if (!clientRequestId) return null;
  const existing = await prisma.tripStatusHistory.findUnique({
    where: { tripId_clientRequestId: { tripId, clientRequestId } },
  });
  return existing ? findScoped(tenantId, tripId) : null;
}

async function assertTenantScoped(tenantId: string, resourceId: string | null, model: string) {
  if (!resourceId) return;

  if (model === "station") {
    const resource = await prisma.station.findFirst({ where: { id: resourceId, tenantId } });
    if (!resource) throw new BadRequestError("Station does not belong to this tenant");
  } else {
    throw new BadRequestError(`Unknown model: ${model}`);
  }
}

async function assertDriverAvailable(tenantId: string, driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, tenantId, status: "ACTIVE" },
  });
  if (!driver) throw new BadRequestError("Driver is not available");
}

async function assertVehicleAvailable(tenantId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, tenantId, status: "ACTIVE" },
  });
  if (!vehicle) throw new BadRequestError("Vehicle is not available");
}

async function generateTripNumber(tenantId: string): Promise<string> {
  const count = await prisma.trip.count({ where: { tenantId } });
  return `TRIP-${String(count + 1).padStart(6, "0")}`;
}

async function findScoped(tenantId: string, id: string) {
  const trip = await prisma.trip.findFirst({
    where: { id, tenantId },
    include: TRIP_INCLUDE,
  });
  if (!trip) throw new NotFoundError("Trip not found");
  return trip;
}

export interface CreateTripInput {
  tripType?: TripType;
  transferType?: TransferType;
  serviceDate?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  originLocationId?: string;
  destinationLocationId?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  instructions?: string;
  notes?: string;
}

export async function createTrip(
  tenantId: string,
  input: CreateTripInput,
  userId: string | null
) {
  if (input.originFacilityId)
    await assertTenantScoped(tenantId, input.originFacilityId, "station");
  if (input.destinationFacilityId)
    await assertTenantScoped(tenantId, input.destinationFacilityId, "station");

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tripNumber = await generateTripNumber(tenantId);
    try {
      const created = await prisma.trip.create({
        data: {
          tenantId,
          tripNumber,
          tripType: input.tripType ?? "DIRECT_DELIVERY",
          transferType: input.transferType,
          status: "DRAFT",
          serviceDate: input.serviceDate ? new Date(input.serviceDate) : undefined,
          originFacilityId: input.originFacilityId,
          destinationFacilityId: input.destinationFacilityId,
          originLocationId: input.originLocationId,
          destinationLocationId: input.destinationLocationId,
          plannedStartTime: input.plannedStartTime ? new Date(input.plannedStartTime) : undefined,
          plannedEndTime: input.plannedEndTime ? new Date(input.plannedEndTime) : undefined,
          instructions: input.instructions,
          notes: input.notes,
          createdById: userId ?? undefined,
          version: 1,
        },
        include: TRIP_INCLUDE,
      });

      domainEvents.emitTyped("trip.created", {
        tripId: created.id,
        tenantId,
        tripNumber: created.tripNumber,
        tripType: created.tripType,
      });

      return created;
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique trip number");
}

export async function getTrip(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface ListTripsParams {
  status?: TripStatus;
  tripType?: TripType;
  transferType?: TransferType;
  driverId?: string;
  vehicleId?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  facilityId?: string;
  serviceDate?: string;
  skip?: number;
  take?: number;
}

export async function listTrips(tenantId: string, params: ListTripsParams) {
  return prisma.trip.findMany({
    where: {
      tenantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.tripType ? { tripType: params.tripType } : {}),
      ...(params.transferType ? { transferType: params.transferType } : {}),
      ...(params.driverId ? { primaryDriverId: params.driverId } : {}),
      ...(params.vehicleId ? { vehicleId: params.vehicleId } : {}),
      ...(params.originFacilityId ? { originFacilityId: params.originFacilityId } : {}),
      ...(params.destinationFacilityId
        ? { destinationFacilityId: params.destinationFacilityId }
        : {}),
      ...(params.facilityId
        ? {
            OR: [{ originFacilityId: params.facilityId }, { destinationFacilityId: params.facilityId }],
          }
        : {}),
      ...(params.serviceDate
        ? {
            serviceDate: {
              gte: new Date(params.serviceDate),
              lt: new Date(new Date(params.serviceDate).getTime() + 86400000),
            },
          }
        : {}),
    },
    include: TRIP_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: params.skip ?? 0,
    take: params.take ?? 50,
  });
}

export interface UpdateTripInput {
  serviceDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  instructions?: string;
  notes?: string;
}

export async function updateTrip(
  tenantId: string,
  id: string,
  input: UpdateTripInput,
  expectedVersion: number,
  userId: string | null
) {
  await findScoped(tenantId, id);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id, version: expectedVersion },
      data: {
        serviceDate: input.serviceDate ? new Date(input.serviceDate) : undefined,
        plannedStartTime: input.plannedStartTime ? new Date(input.plannedStartTime) : undefined,
        plannedEndTime: input.plannedEndTime ? new Date(input.plannedEndTime) : undefined,
        instructions: input.instructions,
        notes: input.notes,
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }
  });

  const updated = await findScoped(tenantId, id);

  domainEvents.emitTyped("trip.updated", { tripId: id, tenantId });

  return updated;
}

export async function assignVehicle(
  tenantId: string,
  tripId: string,
  vehicleId: string,
  expectedVersion: number,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);

  await assertVehicleAvailable(tenantId, vehicleId);

  const vehicle = await prisma.vehicle.findUniqueOrThrow({
    where: { id: vehicleId },
  });

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        vehicleId,
        vehicleCapacityKg: vehicle.capacityKg,
        vehicleCapacityM3: vehicle.capacityM3,
        vehicleCapacityPallets: vehicle.capacityPallets,
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await recordAudit(tx, {
      tenantId,
      entityType: "Trip",
      entityId: tripId,
      action: "VEHICLE_ASSIGNED",
      beforeValue: { vehicleId: trip.vehicleId },
      afterValue: { vehicleId },
      actorId: userId,
    });
  });

  const updated = await findScoped(tenantId, tripId);

  domainEvents.emitTyped("trip.vehicle_assigned", {
    tripId,
    tenantId,
    vehicleId,
  });

  return updated;
}

export async function unassignVehicle(
  tenantId: string,
  tripId: string,
  expectedVersion: number,
  userId: string | null
) {
  await findScoped(tenantId, tripId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        vehicleId: null,
        vehicleCapacityKg: null,
        vehicleCapacityM3: null,
        vehicleCapacityPallets: null,
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }
  });

  return findScoped(tenantId, tripId);
}

export async function assignPrimaryDriver(
  tenantId: string,
  tripId: string,
  driverId: string,
  expectedVersion: number,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);

  await assertDriverAvailable(tenantId, driverId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        primaryDriverId: driverId,
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await recordAudit(tx, {
      tenantId,
      entityType: "Trip",
      entityId: tripId,
      action: "DRIVER_ASSIGNED",
      beforeValue: { primaryDriverId: trip.primaryDriverId },
      afterValue: { primaryDriverId: driverId },
      actorId: userId,
    });
  });

  const updated = await findScoped(tenantId, tripId);

  domainEvents.emitTyped("trip.driver_assigned", {
    tripId,
    tenantId,
    driverId,
    isPrimary: true,
  });

  return updated;
}

export async function unassignPrimaryDriver(
  tenantId: string,
  tripId: string,
  expectedVersion: number,
  userId: string | null
) {
  await findScoped(tenantId, tripId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        primaryDriverId: null,
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }
  });

  return findScoped(tenantId, tripId);
}

export async function addSecondaryDriver(
  tenantId: string,
  tripId: string,
  driverId: string,
  expectedVersion: number,
  userId: string | null
) {
  await findScoped(tenantId, tripId);
  await assertDriverAvailable(tenantId, driverId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: { version: { increment: 1 }, updatedById: userId ?? undefined },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }
    await tx.tripSecondaryDriver.create({
      data: { tripId, driverId },
    });
  });

  return findScoped(tenantId, tripId);
}

export async function removeSecondaryDriver(
  tenantId: string,
  tripId: string,
  driverId: string,
  expectedVersion: number,
  userId: string | null
) {
  await findScoped(tenantId, tripId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: { version: { increment: 1 }, updatedById: userId ?? undefined },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }
    await tx.tripSecondaryDriver.delete({
      where: { tripId_driverId: { tripId, driverId } },
    });
  });

  return findScoped(tenantId, tripId);
}

export async function updateTripStatus(
  tenantId: string,
  tripId: string,
  newStatus: TripStatus,
  note: string | undefined,
  expectedVersion: number,
  changedById: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, tripId, clientRequestId);
  if (replay) return replay;

  const trip = await findScoped(tenantId, tripId);

  if (trip.status !== newStatus && !canTransitionTripStatus(trip.status, newStatus)) {
    throw new BadRequestError(
      `Cannot transition trip from ${trip.status} to ${newStatus}`
    );
  }

  const previousStatus = trip.status;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        status: newStatus,
        version: { increment: 1 },
        updatedById: changedById ?? undefined,
        ...(newStatus === "DISPATCHED" && { dispatchTime: new Date() }),
        ...(newStatus === "IN_PROGRESS" && { actualStartTime: new Date() }),
        ...(newStatus === "ARRIVED" && { arrivalTime: new Date() }),
        ...((newStatus === "COMPLETED" ||
          newStatus === "PARTIALLY_COMPLETED" ||
          newStatus === "FAILED") && {
          actualEndTime: new Date(),
        }),
      },
    });

    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await tx.tripStatusHistory.create({
      data: {
        tripId,
        status: newStatus,
        note,
        changedById: changedById ?? undefined,
        clientRequestId,
      },
    });

    return tx.trip.findUniqueOrThrow({ where: { id: tripId }, include: TRIP_INCLUDE });
  });

  domainEvents.emitTyped("trip.status_changed", {
    tripId,
    tenantId,
    from: previousStatus,
    to: newStatus,
  });

  return updated;
}

export async function addTaskToTrip(
  tenantId: string,
  tripId: string,
  taskId: string,
  stopId: string | null,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });

  if (!task) throw new NotFoundError("Task not found");

  if (task.tripId) {
    throw new BadRequestError("Task is already assigned to another trip");
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      tasks: { connect: { id: taskId } },
    },
    include: TRIP_INCLUDE,
  });

  if (stopId) {
    const routeStop = await prisma.routeStop.findFirst({
      where: { id: stopId, route: { tripId } },
    });
    if (routeStop) {
      await prisma.routeStopTask.create({
        data: {
          tenantId,
          routeStopId: stopId,
          taskId,
          assignmentStatus: "ASSIGNED",
          createdById: userId ?? undefined,
        },
      });
    }
  }

  domainEvents.emitTyped("trip.task_added", {
    tripId,
    tenantId,
    taskId,
  });

  return findScoped(tenantId, tripId);
}

export async function removeTaskFromTrip(
  tenantId: string,
  tripId: string,
  taskId: string,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId, tripId },
  });

  if (!task) throw new NotFoundError("Task not found on this trip");

  await prisma.$transaction(async (tx) => {
    await tx.routeStopTask.deleteMany({
      where: { taskId, routeStop: { route: { tripId } } },
    });

    await tx.task.update({
      where: { id: taskId },
      data: {
        tripId: null,
        routeId: null,
        stopId: null,
      },
    });
  });

  domainEvents.emitTyped("trip.task_removed", {
    tripId,
    tenantId,
    taskId,
  });

  return findScoped(tenantId, tripId);
}

export interface DispatchCheckResult {
  ready: boolean;
  blockers: string[];
}

// Also exported as computeDispatchChecklist so other modules (e.g.
// manifests.service.ts's dispatchTrip) can reuse it instead of maintaining
// a second, drifting copy of the same readiness logic.
export async function getDispatchChecklist(
  tenantId: string,
  tripId: string
): Promise<DispatchCheckResult> {
  const trip = await findScoped(tenantId, tripId);
  const blockers: string[] = [];

  if (!trip.primaryDriverId) blockers.push("No primary driver assigned");
  if (!trip.vehicleId) blockers.push("No vehicle assigned");
  if (!trip.activeRouteId) blockers.push("No route assigned");

  if (trip.activeManifest) {
    if (trip.activeManifest.status !== "SEALED") {
      blockers.push("Manifest must be sealed before dispatch");
    }

    const manifestId = trip.activeManifest.id;
    const openExceptions = trip.exceptions.filter(
      (e) =>
        e.manifestId === manifestId &&
        e.severity === "CRITICAL" &&
        e.status === "OPEN"
    );
    if (openExceptions.length > 0) {
      blockers.push(`${openExceptions.length} critical exceptions must be resolved`);
    }
  }

  if (trip.activeRoute) {
    // A mandatory stop is only a blocker if it has NO location data at all --
    // RouteStop supports non-facility stops (e.g. customer deliveries) via
    // locationName/address instead of facilityId, so requiring facilityId
    // unconditionally would block dispatch of any trip with such a stop.
    const missingStops = trip.activeRoute.stops.filter(
      (s) => s.isMandatory && !s.facilityId && !s.locationName && !s.address
    );
    if (missingStops.length > 0) {
      blockers.push(`${missingStops.length} mandatory route stops missing a location`);
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
  };
}

export async function pauseTrip(
  tenantId: string,
  tripId: string,
  expectedVersion: number,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);

  if (trip.status !== "IN_PROGRESS") {
    throw new BadRequestError("Trip must be IN_PROGRESS to pause");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        status: "PAUSED",
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await tx.tripStatusHistory.create({
      data: {
        tripId,
        status: "PAUSED",
        changedById: userId ?? undefined,
      },
    });

    await recordAudit(tx, {
      tenantId,
      entityType: "Trip",
      entityId: tripId,
      action: "TRIP_PAUSED",
      beforeValue: { status: trip.status },
      afterValue: { status: "PAUSED" },
      actorId: userId,
    });
  });

  const updated = await findScoped(tenantId, tripId);

  domainEvents.emitTyped("trip.paused", {
    tripId,
    tenantId,
  });

  return updated;
}

export async function resumeTrip(
  tenantId: string,
  tripId: string,
  expectedVersion: number,
  userId: string | null
) {
  const trip = await findScoped(tenantId, tripId);

  if (trip.status !== "PAUSED") {
    throw new BadRequestError("Trip must be PAUSED to resume");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.trip.updateMany({
      where: { id: tripId, version: expectedVersion },
      data: {
        status: "IN_PROGRESS",
        version: { increment: 1 },
        updatedById: userId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Trip was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await tx.tripStatusHistory.create({
      data: {
        tripId,
        status: "IN_PROGRESS",
        changedById: userId ?? undefined,
      },
    });

    await recordAudit(tx, {
      tenantId,
      entityType: "Trip",
      entityId: tripId,
      action: "TRIP_RESUMED",
      beforeValue: { status: trip.status },
      afterValue: { status: "IN_PROGRESS" },
      actorId: userId,
    });
  });

  const updated = await findScoped(tenantId, tripId);

  domainEvents.emitTyped("trip.resumed", {
    tripId,
    tenantId,
  });

  return updated;
}

export interface CreateReplacementTripInput {
  vehicleId?: string;
  primaryDriverId?: string;
  replacementReason: string;
}

export async function createReplacementTrip(
  tenantId: string,
  parentTripId: string,
  input: CreateReplacementTripInput,
  userId: string | null
) {
  const parentTrip = await findScoped(tenantId, parentTripId);

  if (parentTrip.replacementTripId) {
    throw new BadRequestError("Trip already has a replacement trip");
  }

  const manifest = await prisma.manifest.findFirst({
    where: { tripId: parentTripId, tenantId },
    include: { items: true },
  });

  if (!manifest) {
    throw new BadRequestError("No manifest found for trip");
  }

  // Check vehicle availability if provided
  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, tenantId },
    });
    if (!vehicle) throw new BadRequestError("Vehicle not found");
  }

  // Check driver availability if provided
  if (input.primaryDriverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: input.primaryDriverId, tenantId },
    });
    if (!driver) throw new BadRequestError("Driver not found");
  }

  const created = await prisma.$transaction(async (tx) => {
    // Generate new trip number
    const tripCount = await tx.trip.count({ where: { tenantId } });
    const newTripNumber = `TRIP-${Date.now()}-${tripCount + 1}`;

    // Create replacement trip
    const replacement = await tx.trip.create({
      data: {
        tenantId,
        tripNumber: newTripNumber,
        tripType: parentTrip.tripType,
        transferType: parentTrip.transferType,
        status: "DRAFT",
        serviceDate: parentTrip.serviceDate,
        vehicleId: input.vehicleId || parentTrip.vehicleId,
        primaryDriverId: input.primaryDriverId || parentTrip.primaryDriverId,
        originFacilityId: parentTrip.originFacilityId,
        destinationFacilityId: parentTrip.destinationFacilityId,
        originLocationId: parentTrip.originLocationId,
        destinationLocationId: parentTrip.destinationLocationId,
        parentTripId,
        replacementReason: input.replacementReason,
        instructions: parentTrip.instructions,
        notes: parentTrip.notes,
        createdById: userId ?? undefined,
      },
      include: TRIP_INCLUDE,
    });

    // Create replacement manifest with carried-forward items
    const newManifestNumber = `MFT-${Date.now()}-${replacement.id.slice(0, 8)}`;
    const newManifest = await tx.manifest.create({
      data: {
        tenantId,
        manifestNumber: newManifestNumber,
        tripId: replacement.id,
        originFacilityId: manifest.originFacilityId,
        destinationFacilityId: manifest.destinationFacilityId,
        status: "DRAFT",
        createdById: userId ?? undefined,
      },
    });

    // Copy manifest items with lineage tracking
    const carryForwardItems = manifest.items.filter((item) => item.receivingStatus !== "RECEIVED");
    for (const item of carryForwardItems) {
      await tx.manifestItem.create({
        data: {
          tenantId,
          manifestId: newManifest.id,
          shipmentId: item.shipmentId,
          cargoItemId: item.cargoItemId,
          handlingUnitId: item.handlingUnitId,
          sourceManifestItemId: item.id,
          itemType: item.itemType,
          identifier: item.identifier,
          plannedQuantity: item.plannedQuantity,
          weight: item.weight,
          volume: item.volume,
          notes: item.notes,
        },
      });
    }

    // Update parent trip to point to replacement
    await tx.trip.update({
      where: { id: parentTripId },
      data: { replacementTripId: replacement.id },
    });

    // Create new route from remaining stops (if parent has an active route)
    if (parentTrip.activeRouteId) {
      const activeRoute = await tx.route.findUnique({
        where: { id: parentTrip.activeRouteId },
        include: { stops: { orderBy: { sequenceNumber: "asc" } } },
      });

      if (activeRoute) {
        const newRouteNumber = `RT-${Date.now()}-${replacement.id.slice(0, 8)}`;
        const newRoute = await tx.route.create({
          data: {
            tenantId,
            routeNumber: newRouteNumber,
            name: `${activeRoute.name} (Replacement)`,
            tripId: replacement.id,
            status: "DRAFT",
            source: "RECALCULATED",
            createdById: userId ?? undefined,
          },
        });

        // Copy remaining stops
        for (const stop of activeRoute.stops) {
          await tx.routeStop.create({
            data: {
              tenantId,
              routeId: newRoute.id,
              sequenceNumber: stop.sequenceNumber,
              stopType: stop.stopType,
              status: "PLANNED",
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

        // Set as active route
        await tx.trip.update({
          where: { id: replacement.id },
          data: { activeRouteId: newRoute.id },
        });
      }
    }

    // Record audit
    await recordAudit(tx, {
      tenantId,
      entityType: "Trip",
      entityId: parentTripId,
      action: "REPLACEMENT_TRIP_CREATED",
      beforeValue: { replacementTripId: parentTrip.replacementTripId },
      afterValue: { replacementTripId: replacement.id, reason: input.replacementReason },
      actorId: userId,
    });

    return replacement;
  });

  domainEvents.emitTyped("trip.replacement_created", {
    originalTripId: parentTripId,
    replacementTripId: created.id,
    tenantId,
    reason: input.replacementReason,
  });

  return created;
}
