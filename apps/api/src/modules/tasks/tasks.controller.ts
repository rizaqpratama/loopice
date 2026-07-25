import type { TaskPriority, TaskStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { assertOwnsTaskOrPrivileged, findOwnDriverId } from "../../lib/assertOwnsOrPrivileged";
import { BadRequestError } from "../../lib/httpError";
import * as tasksService from "./tasks.service";
import {
  addDependencySchema,
  addProofSchema,
  assignTaskSchema,
  bulkAssignSchema,
  bulkStatusSchema,
  cancelTaskSchema,
  completeTaskSchema,
  createExceptionSchema,
  createTaskSchema,
  failTaskSchema,
  partialCompleteTaskSchema,
  unassignTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "./tasks.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

function parseStatusList(value: unknown): TaskStatus[] | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value.split(",") as TaskStatus[];
}

// DRIVER role is route-level allowed onto task endpoints but must be confined
// to its own assigned tasks; every other role that reached this handler via
// requireRole is unrestricted.
async function assertTaskAccess(req: Request, taskId: string): Promise<void> {
  if (req.user?.role !== "DRIVER") return;
  const task = await tasksService.getTaskAssignment(tenantId(req), taskId);
  await assertOwnsTaskOrPrivileged(tenantId(req), req.user.userId, req.user.role, task);
}

export async function list(req: Request, res: Response) {
  const {
    status,
    taskTypeId,
    priority,
    assignedDriverId,
    assignedVehicleId,
    assignedTeamId,
    assignedPartnerId,
    tripId,
    routeId,
    facilityId,
    customerId,
    serviceOrderId,
    scheduledFrom,
    scheduledTo,
    unassigned,
    search,
    page,
    limit,
  } = req.query;

  // DRIVER role only ever sees its own assigned tasks -- any client-supplied
  // assignedDriverId is ignored and overridden with the caller's own driver
  // row (or a sentinel that matches nothing if they have none).
  let assignedDriverIdParam = typeof assignedDriverId === "string" ? assignedDriverId : undefined;
  if (req.user?.role === "DRIVER") {
    const ownDriverId = await findOwnDriverId(tenantId(req), req.user.userId);
    assignedDriverIdParam = ownDriverId ?? "__no_driver_row__";
  }

  res.json(
    await tasksService.listTasks(tenantId(req), {
      status: parseStatusList(status),
      taskTypeId: typeof taskTypeId === "string" ? taskTypeId : undefined,
      priority: typeof priority === "string" ? (priority as TaskPriority) : undefined,
      assignedDriverId: assignedDriverIdParam,
      assignedVehicleId: typeof assignedVehicleId === "string" ? assignedVehicleId : undefined,
      assignedTeamId: typeof assignedTeamId === "string" ? assignedTeamId : undefined,
      assignedPartnerId: typeof assignedPartnerId === "string" ? assignedPartnerId : undefined,
      tripId: typeof tripId === "string" ? tripId : undefined,
      routeId: typeof routeId === "string" ? routeId : undefined,
      facilityId: typeof facilityId === "string" ? facilityId : undefined,
      customerId: typeof customerId === "string" ? customerId : undefined,
      serviceOrderId: typeof serviceOrderId === "string" ? serviceOrderId : undefined,
      scheduledFrom: typeof scheduledFrom === "string" ? scheduledFrom : undefined,
      scheduledTo: typeof scheduledTo === "string" ? scheduledTo : undefined,
      unassigned: unassigned === "true",
      search: typeof search === "string" ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createTaskSchema.parse(req.body);
  const task = await tasksService.createTask(
    tenantId(req),
    req.user?.userId ?? null,
    input,
    req.params.serviceOrderId
  );
  res.status(201).json(task);
}

export async function get(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  res.json(await tasksService.getTask(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTaskSchema.parse(req.body);
  res.json(await tasksService.updateTask(tenantId(req), req.params.id, input));
}

export async function updateStatus(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const { status, note, expectedVersion, clientRequestId } = updateTaskStatusSchema.parse(req.body);
  res.json(
    await tasksService.updateTaskStatus(
      tenantId(req),
      req.params.id,
      status,
      note,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function cancel(req: Request, res: Response) {
  const { reason, expectedVersion, clientRequestId } = cancelTaskSchema.parse(req.body);
  res.json(
    await tasksService.cancelTask(
      tenantId(req),
      req.params.id,
      reason,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function remove(req: Request, res: Response) {
  await tasksService.deleteTask(tenantId(req), req.params.id);
  res.status(204).send();
}

export async function assign(req: Request, res: Response) {
  const { expectedVersion, clientRequestId, ...assignInput } = assignTaskSchema.parse(req.body);
  res.json(
    await tasksService.assignTask(
      tenantId(req),
      req.params.id,
      assignInput,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function unassign(req: Request, res: Response) {
  const { expectedVersion, clientRequestId } = unassignTaskSchema.parse(req.body);
  res.json(
    await tasksService.unassignTask(
      tenantId(req),
      req.params.id,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function bulkAssign(req: Request, res: Response) {
  const { taskIds, ...assignInput } = bulkAssignSchema.parse(req.body);
  res.json(await tasksService.bulkAssignTasks(tenantId(req), taskIds, assignInput, req.user?.userId ?? null));
}

export async function bulkStatus(req: Request, res: Response) {
  const { taskIds, status, note } = bulkStatusSchema.parse(req.body);
  res.json(
    await tasksService.bulkUpdateStatus(tenantId(req), taskIds, status, note, req.user?.userId ?? null)
  );
}

export async function complete(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const { note, proof, expectedVersion, clientRequestId } = completeTaskSchema.parse(req.body);
  res.json(
    await tasksService.completeTask(
      tenantId(req),
      req.params.id,
      note,
      proof,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function partialComplete(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const { note, proof, expectedVersion, clientRequestId } = partialCompleteTaskSchema.parse(req.body);
  res.json(
    await tasksService.partialCompleteTask(
      tenantId(req),
      req.params.id,
      note,
      proof,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function fail(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const { exceptionType, note, expectedVersion, clientRequestId } = failTaskSchema.parse(req.body);
  res.json(
    await tasksService.failTask(
      tenantId(req),
      req.params.id,
      exceptionType,
      note,
      expectedVersion,
      req.user?.userId ?? null,
      clientRequestId
    )
  );
}

export async function addProof(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const input = addProofSchema.parse(req.body);
  res.status(201).json(await tasksService.addProof(tenantId(req), req.params.id, input, req.user?.userId ?? null));
}

export async function reportException(req: Request, res: Response) {
  await assertTaskAccess(req, req.params.id);
  const input = createExceptionSchema.parse(req.body);
  res
    .status(201)
    .json(await tasksService.reportException(tenantId(req), req.params.id, input, req.user?.userId ?? null));
}

export async function addDependency(req: Request, res: Response) {
  const input = addDependencySchema.parse(req.body);
  res.status(201).json(await tasksService.addDependency(tenantId(req), req.params.id, input));
}

export async function listDependencies(req: Request, res: Response) {
  res.json(await tasksService.listDependencies(tenantId(req), req.params.id));
}

export async function removeDependency(req: Request, res: Response) {
  await tasksService.removeDependency(tenantId(req), req.params.id, req.params.dependencyId);
  res.status(204).send();
}
