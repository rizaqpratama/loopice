import {
  canTransitionTaskStatusForType,
  type ExceptionSeverity,
  type ExceptionType,
  type ProofType,
  type TaskPriority,
  type TaskStatus,
} from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/httpError";
import { SAFE_USER_SELECT } from "../../lib/safeUserSelect";

const TASK_INCLUDE = {
  taskType: true,
  customer: true,
  serviceOrder: true,
  facility: true,
  assignedDriver: true,
  assignedVehicle: true,
  assignedStaff: { select: SAFE_USER_SELECT },
  assignedTeam: true,
  assignedPartner: true,
  trip: true,
  route: true,
  stop: true,
  statusHistory: {
    include: { changedBy: { select: SAFE_USER_SELECT } },
    orderBy: { changedAt: "asc" as const },
  },
  shipmentLinks: { include: { shipment: true } },
  proofs: {
    include: { capturedBy: { select: SAFE_USER_SELECT } },
    orderBy: { capturedAt: "asc" as const },
  },
  exceptions: {
    include: {
      reportedBy: { select: SAFE_USER_SELECT },
      assignedTo: { select: SAFE_USER_SELECT },
      resolvedBy: { select: SAFE_USER_SELECT },
      closedBy: { select: SAFE_USER_SELECT },
    },
    orderBy: { reportedAt: "asc" as const },
  },
} satisfies Prisma.TaskInclude;

const TERMINAL_STATUSES: TaskStatus[] = ["COMPLETED", "CANCELLED", "PARTIALLY_COMPLETED"];

async function assertTaskTypeInTenant(tenantId: string, taskTypeId: string) {
  const taskType = await prisma.taskTypeConfig.findFirst({ where: { id: taskTypeId, tenantId } });
  if (!taskType) throw new BadRequestError("Task type does not belong to this tenant");
  if (!taskType.isActive) throw new BadRequestError("Task type is not active");
  return taskType;
}

// -- TaskTypeConfig-driven validation --------------------------------------
// The configuration read from TaskTypeConfig (seeded defaults or a
// tenant's own edits) is enforced generically here rather than hardcoded
// per taskType code -- adding/adjusting a task type never needs a deploy.

function validateRequiredFields(
  taskType: { name: string; requiredFields: string[] },
  input: Record<string, unknown>
) {
  if (taskType.requiredFields.length === 0) return;
  const missing = taskType.requiredFields.filter((field) => {
    const value = input[field];
    return value === undefined || value === null || value === "";
  });
  if (missing.length > 0) {
    throw new BadRequestError(`Task type "${taskType.name}" requires: ${missing.join(", ")}`);
  }
}

function validateLocationRequirement(
  taskType: { name: string; locationRequirement: string },
  input: { facilityId?: string; customerId?: string; locationType?: string }
) {
  if (taskType.locationRequirement === "FACILITY_ONLY" && !input.facilityId) {
    throw new BadRequestError(`Task type "${taskType.name}" requires a facility location`);
  }
  if (
    taskType.locationRequirement === "CUSTOMER_ADDRESS_ONLY" &&
    input.locationType !== "CUSTOMER_ADDRESS" &&
    !input.customerId
  ) {
    throw new BadRequestError(`Task type "${taskType.name}" requires a customer address location`);
  }
}

function validateCargoRequirement(
  taskType: { name: string; cargoRequirement: string },
  shipmentIds: string[] | undefined
) {
  const hasCargo = !!(shipmentIds && shipmentIds.length > 0);
  if (taskType.cargoRequirement === "REQUIRED" && !hasCargo) {
    throw new BadRequestError(`Task type "${taskType.name}" requires at least one linked shipment`);
  }
  if (taskType.cargoRequirement === "NONE" && hasCargo) {
    throw new BadRequestError(`Task type "${taskType.name}" does not allow linked shipments`);
  }
}

function validateFacilityRequirement(
  taskType: { name: string; facilityRequirement: boolean },
  facilityId: string | undefined
) {
  if (taskType.facilityRequirement && !facilityId) {
    throw new BadRequestError(`Task type "${taskType.name}" requires a facility`);
  }
}

function validateAssigneeTypes(
  taskType: { name: string; allowedAssigneeTypes: string[] },
  input: {
    assignedDriverId?: string;
    assignedVehicleId?: string;
    assignedStaffId?: string;
    assignedTeamId?: string;
    assignedPartnerId?: string;
  }
) {
  if (taskType.allowedAssigneeTypes.length === 0) return;
  const attempted: string[] = [];
  if (input.assignedDriverId) attempted.push("DRIVER");
  if (input.assignedVehicleId) attempted.push("VEHICLE");
  if (input.assignedStaffId) attempted.push("STAFF");
  if (input.assignedTeamId) attempted.push("TEAM");
  if (input.assignedPartnerId) attempted.push("PARTNER");
  const disallowed = attempted.filter((t) => !taskType.allowedAssigneeTypes.includes(t));
  if (disallowed.length > 0) {
    throw new BadRequestError(
      `Task type "${taskType.name}" does not allow assignee type(s): ${disallowed.join(", ")}`
    );
  }
}

function validateProofTypes(
  taskType: { name: string; requiredProofTypes: string[] },
  proof: { type: string }[] | undefined
) {
  if (taskType.requiredProofTypes.length === 0) return;
  const provided = new Set((proof ?? []).map((p) => p.type));
  const missing = taskType.requiredProofTypes.filter((t) => !provided.has(t));
  if (missing.length > 0) {
    throw new BadRequestError(`Task type "${taskType.name}" requires proof: ${missing.join(", ")}`);
  }
}

async function assertServiceOrderInTenant(tenantId: string, serviceOrderId: string) {
  const serviceOrder = await prisma.serviceOrder.findFirst({ where: { id: serviceOrderId, tenantId } });
  if (!serviceOrder) throw new BadRequestError("Service order does not belong to this tenant");
}

async function assertCustomerInTenant(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) throw new BadRequestError("Customer does not belong to this tenant");
}

async function assertFacilityInTenant(tenantId: string, facilityId: string) {
  const facility = await prisma.station.findFirst({ where: { id: facilityId, tenantId } });
  if (!facility) throw new BadRequestError("Facility does not belong to this tenant");
}

async function assertShipmentsInTenant(tenantId: string, shipmentIds: string[]) {
  const count = await prisma.shipment.count({ where: { id: { in: shipmentIds }, tenantId } });
  if (count !== shipmentIds.length) {
    throw new BadRequestError("One or more shipments do not belong to this tenant");
  }
}

async function generateTaskNumber(tenantId: string): Promise<string> {
  const count = await prisma.task.count({ where: { tenantId } });
  return `TSK-${String(count + 1).padStart(6, "0")}`;
}

export interface ListTasksParams {
  status?: TaskStatus[];
  taskTypeId?: string;
  priority?: TaskPriority;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  assignedTeamId?: string;
  assignedPartnerId?: string;
  tripId?: string;
  routeId?: string;
  facilityId?: string;
  customerId?: string;
  serviceOrderId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  unassigned?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listTasks(tenantId: string, params: ListTasksParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

  const where: Prisma.TaskWhereInput = {
    tenantId,
    ...(params.status && params.status.length > 0 ? { status: { in: params.status } } : {}),
    ...(params.taskTypeId ? { taskTypeId: params.taskTypeId } : {}),
    ...(params.priority ? { priority: params.priority } : {}),
    ...(params.assignedDriverId ? { assignedDriverId: params.assignedDriverId } : {}),
    ...(params.assignedVehicleId ? { assignedVehicleId: params.assignedVehicleId } : {}),
    ...(params.assignedTeamId ? { assignedTeamId: params.assignedTeamId } : {}),
    ...(params.assignedPartnerId ? { assignedPartnerId: params.assignedPartnerId } : {}),
    ...(params.tripId ? { tripId: params.tripId } : {}),
    ...(params.routeId ? { routeId: params.routeId } : {}),
    ...(params.facilityId ? { facilityId: params.facilityId } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.serviceOrderId ? { serviceOrderId: params.serviceOrderId } : {}),
    ...(params.unassigned
      ? {
          assignedDriverId: null,
          assignedVehicleId: null,
          assignedStaffId: null,
          assignedTeamId: null,
          assignedPartnerId: null,
        }
      : {}),
    ...(params.scheduledFrom || params.scheduledTo
      ? {
          scheduledDate: {
            ...(params.scheduledFrom ? { gte: new Date(params.scheduledFrom) } : {}),
            ...(params.scheduledTo ? { lte: new Date(params.scheduledTo) } : {}),
          },
        }
      : {}),
    ...(params.search
      ? {
          OR: [
            { taskNumber: { contains: params.search, mode: "insensitive" } },
            { instructions: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total, page, limit };
}

export interface CreateTaskInput {
  taskTypeId: string;
  priority?: TaskPriority;
  serviceOrderId?: string;
  customerId?: string;
  facilityId?: string;
  shipmentIds?: string[];
  scheduledDate?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  estimatedServiceDurationMinutes?: number;
  requiredSkills?: string[];
  requiredVehicleCapabilities?: string[];
  instructions?: string;
  notes?: string;
  locationType?: "FACILITY" | "CUSTOMER_ADDRESS" | "PARTNER_ADDRESS" | "CUSTOM";
  locationName?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationContactName?: string;
  locationContactPhone?: string;
  locationAccessNotes?: string;
}

export async function createTask(
  tenantId: string,
  createdById: string | null,
  input: CreateTaskInput,
  serviceOrderIdFromParams?: string
) {
  const serviceOrderId = serviceOrderIdFromParams ?? input.serviceOrderId;

  const taskType = await assertTaskTypeInTenant(tenantId, input.taskTypeId);
  if (serviceOrderId) await assertServiceOrderInTenant(tenantId, serviceOrderId);
  if (input.customerId) await assertCustomerInTenant(tenantId, input.customerId);
  if (input.facilityId) await assertFacilityInTenant(tenantId, input.facilityId);
  if (input.shipmentIds && input.shipmentIds.length > 0) {
    await assertShipmentsInTenant(tenantId, input.shipmentIds);
  }

  validateRequiredFields(taskType, { ...input, serviceOrderId });
  validateLocationRequirement(taskType, input);
  validateCargoRequirement(taskType, input.shipmentIds);
  validateFacilityRequirement(taskType, input.facilityId);

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const taskNumber = await generateTaskNumber(tenantId);
    try {
      const created = await prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            tenantId,
            taskNumber,
            taskTypeId: input.taskTypeId,
            serviceOrderId,
            customerId: input.customerId,
            facilityId: input.facilityId,
            scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
            timeWindowStart: input.timeWindowStart ? new Date(input.timeWindowStart) : undefined,
            timeWindowEnd: input.timeWindowEnd ? new Date(input.timeWindowEnd) : undefined,
            estimatedServiceDurationMinutes: input.estimatedServiceDurationMinutes,
            requiredSkills: input.requiredSkills ?? [],
            requiredVehicleCapabilities: input.requiredVehicleCapabilities ?? [],
            instructions: input.instructions,
            notes: input.notes,
            priority: input.priority ?? "NORMAL",
            locationType: input.locationType ?? "CUSTOM",
            locationName: input.locationName,
            locationAddress: input.locationAddress,
            locationLatitude: input.locationLatitude,
            locationLongitude: input.locationLongitude,
            locationContactName: input.locationContactName,
            locationContactPhone: input.locationContactPhone,
            locationAccessNotes: input.locationAccessNotes,
            createdById: createdById ?? undefined,
            status: "DRAFT",
          },
        });
        await tx.taskStatusHistory.create({
          data: { taskId: task.id, status: "DRAFT", changedById: createdById ?? undefined },
        });
        if (input.shipmentIds && input.shipmentIds.length > 0) {
          await tx.taskShipment.createMany({
            data: input.shipmentIds.map((shipmentId) => ({ taskId: task.id, shipmentId })),
          });
        }
        return tx.task.findUniqueOrThrow({ where: { id: task.id }, include: TASK_INCLUDE });
      });
      domainEvents.emitTyped("task.created", { taskId: created.id, tenantId, taskNumber: created.taskNumber });
      return created;
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique task number");
}

async function findScoped(tenantId: string, id: string) {
  const task = await prisma.task.findFirst({ where: { id, tenantId }, include: TASK_INCLUDE });
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export async function getTask(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

// Lightweight lookup for the DRIVER-role ownership check -- avoids pulling
// the full TASK_INCLUDE graph just to compare assignedDriverId.
export async function getTaskAssignment(tenantId: string, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, tenantId },
    select: { assignedDriverId: true },
  });
  if (!task) throw new NotFoundError("Task not found");
  return task;
}

export interface UpdateTaskInput {
  priority?: TaskPriority;
  facilityId?: string;
  scheduledDate?: string | null;
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  estimatedServiceDurationMinutes?: number | null;
  requiredSkills?: string[];
  requiredVehicleCapabilities?: string[];
  instructions?: string;
  notes?: string;
  locationType?: "FACILITY" | "CUSTOMER_ADDRESS" | "PARTNER_ADDRESS" | "CUSTOM";
  locationName?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationContactName?: string;
  locationContactPhone?: string;
  locationAccessNotes?: string;
  expectedVersion: number;
}

function toDateField(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(value);
}

export async function updateTask(tenantId: string, id: string, input: UpdateTaskInput) {
  const task = await findScoped(tenantId, id);
  if (TERMINAL_STATUSES.includes(task.status)) {
    throw new BadRequestError(`Cannot edit a task in ${task.status} status`);
  }
  if (input.facilityId) await assertFacilityInTenant(tenantId, input.facilityId);

  const result = await prisma.task.updateMany({
    where: { id, version: input.expectedVersion },
    data: {
      priority: input.priority,
      facilityId: input.facilityId,
      scheduledDate: toDateField(input.scheduledDate),
      timeWindowStart: toDateField(input.timeWindowStart),
      timeWindowEnd: toDateField(input.timeWindowEnd),
      estimatedServiceDurationMinutes: input.estimatedServiceDurationMinutes,
      requiredSkills: input.requiredSkills,
      requiredVehicleCapabilities: input.requiredVehicleCapabilities,
      instructions: input.instructions,
      notes: input.notes,
      locationType: input.locationType,
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      locationLatitude: input.locationLatitude,
      locationLongitude: input.locationLongitude,
      locationContactName: input.locationContactName,
      locationContactPhone: input.locationContactPhone,
      locationAccessNotes: input.locationAccessNotes,
      version: { increment: 1 },
    },
  });
  if (result.count === 0) {
    throw new ConflictError(`Task was modified by someone else (expected version ${input.expectedVersion})`);
  }
  return findScoped(tenantId, id);
}

async function replayIfIdempotent(tenantId: string, taskId: string, clientRequestId: string | undefined) {
  if (!clientRequestId) return null;
  const existing = await prisma.taskStatusHistory.findUnique({
    where: { taskId_clientRequestId: { taskId, clientRequestId } },
  });
  return existing ? findScoped(tenantId, taskId) : null;
}

export async function updateTaskStatus(
  tenantId: string,
  id: string,
  status: TaskStatus,
  note: string | undefined,
  expectedVersion: number,
  changedById: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);

  if (task.status !== status && !canTransitionTaskStatusForType(task.taskType, task.status, status)) {
    throw new BadRequestError(`Cannot transition task from ${task.status} to ${status}`);
  }
  await assertDependenciesSatisfied(id, status);
  const previousStatus = task.status;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: { status, version: { increment: 1 }, updatedById: changedById ?? undefined },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: { taskId: id, status, note, changedById: changedById ?? undefined, clientRequestId },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.status_changed", { taskId: id, tenantId, from: previousStatus, to: status });
  return updated;
}

export async function cancelTask(
  tenantId: string,
  id: string,
  reason: string,
  expectedVersion: number,
  changedById: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (!canTransitionTaskStatusForType(task.taskType, task.status, "CANCELLED")) {
    throw new BadRequestError(`Cannot cancel a task in ${task.status} status`);
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: { status: "CANCELLED", version: { increment: 1 }, updatedById: changedById ?? undefined },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: {
        taskId: id,
        status: "CANCELLED",
        note: reason,
        changedById: changedById ?? undefined,
        clientRequestId,
      },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.cancelled", { taskId: id, tenantId, reason });
  return cancelled;
}

export interface RescheduleTaskInput {
  scheduledDate?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  reason: string;
}

export async function rescheduleTask(
  tenantId: string,
  id: string,
  input: RescheduleTaskInput,
  expectedVersion: number,
  changedById: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (!canTransitionTaskStatusForType(task.taskType, task.status, "RESCHEDULED")) {
    throw new BadRequestError(`Cannot reschedule a task in ${task.status} status`);
  }

  const rescheduled = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: "RESCHEDULED",
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        timeWindowStart: input.timeWindowStart ? new Date(input.timeWindowStart) : undefined,
        timeWindowEnd: input.timeWindowEnd ? new Date(input.timeWindowEnd) : undefined,
        version: { increment: 1 },
        updatedById: changedById ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: {
        taskId: id,
        status: "RESCHEDULED",
        note: input.reason,
        previousScheduledDate: task.scheduledDate,
        previousTimeWindowStart: task.timeWindowStart,
        previousTimeWindowEnd: task.timeWindowEnd,
        changedById: changedById ?? undefined,
        clientRequestId,
      },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.rescheduled", { taskId: id, tenantId, reason: input.reason });
  return rescheduled;
}

export async function deleteTask(tenantId: string, id: string) {
  const task = await findScoped(tenantId, id);
  if (task.status !== "DRAFT") {
    throw new BadRequestError("Only a draft task can be deleted");
  }
  await prisma.taskShipment.deleteMany({ where: { taskId: id } });
  await prisma.taskStatusHistory.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
}

// -- Assignment -----------------------------------------------------------

const ACTIVE_TASK_STATUSES: TaskStatus[] = [
  "ASSIGNED",
  "PLANNED",
  "READY",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

async function assertDriverInTenant(tenantId: string, driverId: string) {
  const driver = await prisma.driver.findFirst({ where: { id: driverId, tenantId } });
  if (!driver) throw new BadRequestError("Driver does not belong to this tenant");
  return driver;
}

async function assertVehicleInTenant(tenantId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId } });
  if (!vehicle) throw new BadRequestError("Vehicle does not belong to this tenant");
  return vehicle;
}

async function assertStaffInTenant(tenantId: string, staffId: string) {
  const staff = await prisma.user.findFirst({ where: { id: staffId, tenantId } });
  if (!staff) throw new BadRequestError("Staff member does not belong to this tenant");
}

async function assertTeamInTenant(tenantId: string, teamId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, tenantId } });
  if (!team) throw new BadRequestError("Team does not belong to this tenant");
}

async function assertPartnerInTenant(tenantId: string, partnerId: string) {
  const partner = await prisma.partner.findFirst({ where: { id: partnerId, tenantId } });
  if (!partner) throw new BadRequestError("Partner does not belong to this tenant");
}

async function assertTripInTenant(tenantId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, tenantId } });
  if (!trip) throw new BadRequestError("Trip does not belong to this tenant");
}

async function assertRouteInTenant(tenantId: string, routeId: string) {
  const route = await prisma.route.findFirst({ where: { id: routeId, tenantId } });
  if (!route) throw new BadRequestError("Route does not belong to this tenant");
}

async function assertStopInTenant(tenantId: string, stopId: string) {
  const stop = await prisma.routeStop.findFirst({ where: { id: stopId, tenantId } });
  if (!stop) throw new BadRequestError("Stop does not belong to this tenant");
}

function assertCapabilityMatch(
  task: { requiredSkills: string[]; requiredVehicleCapabilities: string[] },
  driver: { skills: string[] } | null,
  vehicle: { capabilities: string[] } | null
) {
  if (driver && task.requiredSkills.length > 0) {
    const missing = task.requiredSkills.filter((s) => !driver.skills.includes(s));
    if (missing.length > 0) {
      throw new BadRequestError(`Driver is missing required skills: ${missing.join(", ")}`);
    }
  }
  if (vehicle && task.requiredVehicleCapabilities.length > 0) {
    const missing = task.requiredVehicleCapabilities.filter((c) => !vehicle.capabilities.includes(c));
    if (missing.length > 0) {
      throw new BadRequestError(`Vehicle is missing required capabilities: ${missing.join(", ")}`);
    }
  }
}

async function assertAvailability(
  tenantId: string,
  task: { id: string; timeWindowStart: Date | null; timeWindowEnd: Date | null },
  driverId: string | undefined,
  vehicleId: string | undefined
) {
  if (!task.timeWindowStart || !task.timeWindowEnd) return; // no window -> nothing to conflict-check

  if (driverId) {
    const conflict = await prisma.task.findFirst({
      where: {
        tenantId,
        assignedDriverId: driverId,
        id: { not: task.id },
        status: { in: ACTIVE_TASK_STATUSES },
        timeWindowStart: { lt: task.timeWindowEnd },
        timeWindowEnd: { gt: task.timeWindowStart },
      },
    });
    if (conflict) {
      throw new ConflictError(
        `Driver is already assigned to task ${conflict.taskNumber} in this time window`
      );
    }
  }
  if (vehicleId) {
    const conflict = await prisma.task.findFirst({
      where: {
        tenantId,
        assignedVehicleId: vehicleId,
        id: { not: task.id },
        status: { in: ACTIVE_TASK_STATUSES },
        timeWindowStart: { lt: task.timeWindowEnd },
        timeWindowEnd: { gt: task.timeWindowStart },
      },
    });
    if (conflict) {
      throw new ConflictError(
        `Vehicle is already assigned to task ${conflict.taskNumber} in this time window`
      );
    }
  }
}

export interface AssignTaskInput {
  assignedDriverId?: string;
  assignedVehicleId?: string;
  assignedStaffId?: string;
  assignedTeamId?: string;
  assignedPartnerId?: string;
  tripId?: string;
  routeId?: string;
  stopId?: string;
  override?: boolean;
  overrideReason?: string;
}

export async function assignTask(
  tenantId: string,
  id: string,
  input: AssignTaskInput,
  expectedVersion: number,
  actorId: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (task.status !== "UNASSIGNED" && task.status !== "ASSIGNED") {
    throw new BadRequestError(`Cannot assign a task in ${task.status} status`);
  }
  if (task.status !== "ASSIGNED" && !canTransitionTaskStatusForType(task.taskType, task.status, "ASSIGNED")) {
    throw new BadRequestError(`Cannot transition task from ${task.status} to ASSIGNED`);
  }
  validateAssigneeTypes(task.taskType, input);

  const driver = input.assignedDriverId ? await assertDriverInTenant(tenantId, input.assignedDriverId) : null;
  const vehicle = input.assignedVehicleId
    ? await assertVehicleInTenant(tenantId, input.assignedVehicleId)
    : null;
  if (input.assignedStaffId) await assertStaffInTenant(tenantId, input.assignedStaffId);
  if (input.assignedTeamId) await assertTeamInTenant(tenantId, input.assignedTeamId);
  if (input.assignedPartnerId) await assertPartnerInTenant(tenantId, input.assignedPartnerId);
  if (input.tripId) await assertTripInTenant(tenantId, input.tripId);
  if (input.routeId) await assertRouteInTenant(tenantId, input.routeId);
  if (input.stopId) await assertStopInTenant(tenantId, input.stopId);

  if (!input.override) {
    assertCapabilityMatch(task, driver, vehicle);
    await assertAvailability(tenantId, task, input.assignedDriverId, input.assignedVehicleId);
  }

  const assigned = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: "ASSIGNED",
        assignedDriverId: input.assignedDriverId,
        assignedVehicleId: input.assignedVehicleId,
        assignedStaffId: input.assignedStaffId,
        assignedTeamId: input.assignedTeamId,
        assignedPartnerId: input.assignedPartnerId,
        tripId: input.tripId,
        routeId: input.routeId,
        stopId: input.stopId,
        version: { increment: 1 },
        updatedById: actorId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: {
        taskId: id,
        status: "ASSIGNED",
        isOverride: !!input.override,
        overrideReason: input.overrideReason,
        changedById: actorId ?? undefined,
        clientRequestId,
      },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.assigned", {
    taskId: id,
    tenantId,
    assignedDriverId: input.assignedDriverId,
    assignedVehicleId: input.assignedVehicleId,
  });
  return assigned;
}

export async function unassignTask(
  tenantId: string,
  id: string,
  expectedVersion: number,
  actorId: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (task.status !== "ASSIGNED") {
    throw new BadRequestError(`Cannot unassign a task in ${task.status} status`);
  }

  const unassigned = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: "UNASSIGNED",
        assignedDriverId: null,
        assignedVehicleId: null,
        assignedStaffId: null,
        assignedTeamId: null,
        assignedPartnerId: null,
        version: { increment: 1 },
        updatedById: actorId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: { taskId: id, status: "UNASSIGNED", changedById: actorId ?? undefined, clientRequestId },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.unassigned", { taskId: id, tenantId });
  return unassigned;
}

export interface BulkResult {
  taskId: string;
  success: boolean;
  error?: string;
}

export async function bulkAssignTasks(
  tenantId: string,
  taskIds: string[],
  input: AssignTaskInput,
  actorId: string | null
): Promise<BulkResult[]> {
  const results: BulkResult[] = [];
  for (const taskId of taskIds) {
    try {
      const current = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
      if (!current) throw new NotFoundError("Task not found");
      await assignTask(tenantId, taskId, input, current.version, actorId);
      results.push({ taskId, success: true });
    } catch (err) {
      results.push({ taskId, success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return results;
}

export async function bulkUpdateStatus(
  tenantId: string,
  taskIds: string[],
  status: TaskStatus,
  note: string | undefined,
  actorId: string | null
): Promise<BulkResult[]> {
  const results: BulkResult[] = [];
  for (const taskId of taskIds) {
    try {
      const current = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
      if (!current) throw new NotFoundError("Task not found");
      await updateTaskStatus(tenantId, taskId, status, note, current.version, actorId);
      results.push({ taskId, success: true });
    } catch (err) {
      results.push({ taskId, success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return results;
}

// -- Completion / proof / exceptions ---------------------------------------

export interface ProofEntryInput {
  type: ProofType;
  fileUrl?: string;
  textValue?: string;
  numericValue?: number;
  latitude?: number;
  longitude?: number;
}

export async function completeTask(
  tenantId: string,
  id: string,
  note: string | undefined,
  proof: ProofEntryInput[] | undefined,
  expectedVersion: number,
  actorId: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (task.status !== "COMPLETED" && !canTransitionTaskStatusForType(task.taskType, task.status, "COMPLETED")) {
    throw new BadRequestError(`Cannot complete a task in ${task.status} status`);
  }
  validateProofTypes(task.taskType, proof);
  await assertDependenciesSatisfied(id, "COMPLETED");

  const completed = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: "COMPLETED",
        actualCompletionTime: now,
        version: { increment: 1 },
        updatedById: actorId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: { taskId: id, status: "COMPLETED", note, changedById: actorId ?? undefined, clientRequestId },
    });
    if (proof && proof.length > 0) {
      await tx.taskProofOfCompletion.createMany({
        data: proof.map((p) => ({
          taskId: id,
          type: p.type,
          fileUrl: p.fileUrl,
          textValue: p.textValue,
          numericValue: p.numericValue,
          latitude: p.latitude,
          longitude: p.longitude,
          capturedById: actorId ?? undefined,
        })),
      });
    }
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.completed", { taskId: id, tenantId });
  return completed;
}

export async function partialCompleteTask(
  tenantId: string,
  id: string,
  note: string,
  proof: ProofEntryInput[] | undefined,
  expectedVersion: number,
  actorId: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (
    task.status !== "PARTIALLY_COMPLETED" &&
    !canTransitionTaskStatusForType(task.taskType, task.status, "PARTIALLY_COMPLETED")
  ) {
    throw new BadRequestError(`Cannot partially complete a task in ${task.status} status`);
  }
  validateProofTypes(task.taskType, proof);
  await assertDependenciesSatisfied(id, "PARTIALLY_COMPLETED");

  const partiallyCompleted = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status: "PARTIALLY_COMPLETED",
        actualCompletionTime: now,
        version: { increment: 1 },
        updatedById: actorId ?? undefined,
      },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: {
        taskId: id,
        status: "PARTIALLY_COMPLETED",
        note,
        changedById: actorId ?? undefined,
        clientRequestId,
      },
    });
    if (proof && proof.length > 0) {
      await tx.taskProofOfCompletion.createMany({
        data: proof.map((p) => ({
          taskId: id,
          type: p.type,
          fileUrl: p.fileUrl,
          textValue: p.textValue,
          numericValue: p.numericValue,
          latitude: p.latitude,
          longitude: p.longitude,
          capturedById: actorId ?? undefined,
        })),
      });
    }
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.partially_completed", { taskId: id, tenantId });
  return partiallyCompleted;
}

export async function failTask(
  tenantId: string,
  id: string,
  exceptionType: ExceptionType,
  note: string | undefined,
  expectedVersion: number,
  actorId: string | null,
  clientRequestId?: string
) {
  const replay = await replayIfIdempotent(tenantId, id, clientRequestId);
  if (replay) return replay;

  const task = await findScoped(tenantId, id);
  if (task.status !== "FAILED" && !canTransitionTaskStatusForType(task.taskType, task.status, "FAILED")) {
    throw new BadRequestError(`Cannot fail a task in ${task.status} status`);
  }

  const failed = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id, version: expectedVersion },
      data: { status: "FAILED", version: { increment: 1 }, updatedById: actorId ?? undefined },
    });
    if (result.count === 0) {
      throw new ConflictError(`Task was modified by someone else (expected version ${expectedVersion})`);
    }
    await tx.taskStatusHistory.create({
      data: { taskId: id, status: "FAILED", note, changedById: actorId ?? undefined, clientRequestId },
    });
    await tx.taskException.create({
      data: {
        tenantId,
        taskId: id,
        type: exceptionType,
        status: "OPEN",
        description: note,
        reportedById: actorId ?? undefined,
      },
    });
    return tx.task.findUniqueOrThrow({ where: { id }, include: TASK_INCLUDE });
  });
  domainEvents.emitTyped("task.failed", { taskId: id, tenantId, exceptionType });
  return failed;
}

export async function addProof(tenantId: string, taskId: string, input: ProofEntryInput, actorId: string | null) {
  await findScoped(tenantId, taskId);
  return prisma.taskProofOfCompletion.create({
    data: {
      taskId,
      type: input.type,
      fileUrl: input.fileUrl,
      textValue: input.textValue,
      numericValue: input.numericValue,
      latitude: input.latitude,
      longitude: input.longitude,
      capturedById: actorId ?? undefined,
    },
  });
}

export interface ReportExceptionInput {
  type: ExceptionType;
  severity?: ExceptionSeverity;
  description?: string;
}

export async function reportException(
  tenantId: string,
  taskId: string,
  input: ReportExceptionInput,
  actorId: string | null
) {
  await findScoped(tenantId, taskId);
  const exception = await prisma.taskException.create({
    data: {
      tenantId,
      taskId,
      type: input.type,
      severity: input.severity ?? "MEDIUM",
      status: "OPEN",
      description: input.description,
      reportedById: actorId ?? undefined,
    },
  });
  domainEvents.emitTyped("task.exception_reported", {
    taskId,
    tenantId,
    exceptionId: exception.id,
    type: exception.type,
  });
  return exception;
}

// -- Dependency graph -------------------------------------------------------
// Deliberately a simple, validated graph (predecessor/successor edges with
// a type), not a general workflow engine. Cycle detection is a
// depth-capped BFS, not a generic graph library.

const DEPENDENCY_GATED_STATUSES: TaskStatus[] = [
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
];

async function assertDependenciesSatisfied(taskId: string, targetStatus: TaskStatus) {
  if (!DEPENDENCY_GATED_STATUSES.includes(targetStatus)) return;
  const deps = await prisma.taskDependency.findMany({
    where: { successorTaskId: taskId, type: "FINISH_TO_START" },
    include: { predecessorTask: true },
  });
  const unmet = deps.filter((d) => d.predecessorTask.status !== "COMPLETED");
  if (unmet.length > 0) {
    throw new BadRequestError(
      `Blocked by incomplete predecessor task(s): ${unmet.map((d) => d.predecessorTask.taskNumber).join(", ")}`
    );
  }
}

const MAX_CYCLE_CHECK_DEPTH = 50;

async function wouldCreateCycle(predecessorTaskId: string, successorTaskId: string): Promise<boolean> {
  let frontier = [successorTaskId];
  const visited = new Set<string>();
  for (let depth = 0; depth < MAX_CYCLE_CHECK_DEPTH && frontier.length > 0; depth++) {
    if (frontier.includes(predecessorTaskId)) return true;
    const unvisited = frontier.filter((id) => !visited.has(id));
    unvisited.forEach((id) => visited.add(id));
    if (unvisited.length === 0) break;
    const edges = await prisma.taskDependency.findMany({
      where: { predecessorTaskId: { in: unvisited } },
      select: { successorTaskId: true },
    });
    frontier = edges.map((e) => e.successorTaskId);
  }
  return false;
}

export interface AddDependencyInput {
  relatedTaskId: string;
  type: "FINISH_TO_START" | "START_TO_START" | "MANUAL_RELEASE";
  direction: "predecessor" | "successor";
}

export async function addDependency(tenantId: string, taskId: string, input: AddDependencyInput) {
  await findScoped(tenantId, taskId);
  if (input.relatedTaskId === taskId) {
    throw new BadRequestError("A task cannot depend on itself");
  }
  const relatedTask = await prisma.task.findFirst({ where: { id: input.relatedTaskId, tenantId } });
  if (!relatedTask) throw new BadRequestError("Related task does not belong to this tenant");

  const predecessorTaskId = input.direction === "predecessor" ? input.relatedTaskId : taskId;
  const successorTaskId = input.direction === "predecessor" ? taskId : input.relatedTaskId;

  if (await wouldCreateCycle(predecessorTaskId, successorTaskId)) {
    throw new BadRequestError("This dependency would create a cycle");
  }

  try {
    await prisma.taskDependency.create({
      data: { tenantId, predecessorTaskId, successorTaskId, type: input.type },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("This dependency already exists");
    }
    throw err;
  }
  return listDependencies(tenantId, taskId);
}

export async function listDependencies(tenantId: string, taskId: string) {
  await findScoped(tenantId, taskId);
  const [asPredecessor, asSuccessor] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { tenantId, predecessorTaskId: taskId },
      include: { successorTask: true },
    }),
    prisma.taskDependency.findMany({
      where: { tenantId, successorTaskId: taskId },
      include: { predecessorTask: true },
    }),
  ]);
  return { asPredecessor, asSuccessor };
}

export async function removeDependency(tenantId: string, taskId: string, dependencyId: string) {
  const dependency = await prisma.taskDependency.findFirst({
    where: {
      id: dependencyId,
      tenantId,
      OR: [{ predecessorTaskId: taskId }, { successorTaskId: taskId }],
    },
  });
  if (!dependency) throw new NotFoundError("Dependency not found on this task");
  await prisma.taskDependency.delete({ where: { id: dependencyId } });
}
