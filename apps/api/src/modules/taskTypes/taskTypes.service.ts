import type {
  AssigneeType,
  CargoRequirement,
  ExceptionType,
  LocationRequirement,
  ProofType,
  TaskStatus,
} from "@loopice/shared";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/httpError";

export async function listTaskTypes(tenantId: string, search?: string) {
  return prisma.taskTypeConfig.findMany({
    where: {
      tenantId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export interface TaskTypeConfigInput {
  code: string;
  name: string;
  category: string;
  allowedStatuses?: TaskStatus[];
  requiredFields?: string[];
  requiredProofTypes?: ProofType[];
  allowedAssigneeTypes?: AssigneeType[];
  defaultServiceDurationMinutes?: number;
  locationRequirement?: LocationRequirement;
  cargoRequirement?: CargoRequirement;
  facilityRequirement?: boolean;
  isRouteable?: boolean;
  isBillable?: boolean;
  isCustomerFacing?: boolean;
  failureReasonCodes?: ExceptionType[];
  completionChecklist?: string[];
}

async function assertCodeAvailable(tenantId: string, code: string, excludeId?: string) {
  const existing = await prisma.taskTypeConfig.findUnique({ where: { tenantId_code: { tenantId, code } } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("A task type with this code already exists in this tenant");
  }
}

export async function createTaskType(tenantId: string, input: TaskTypeConfigInput) {
  await assertCodeAvailable(tenantId, input.code);
  return prisma.taskTypeConfig.create({ data: { tenantId, ...input } });
}

async function findScoped(tenantId: string, id: string) {
  const taskType = await prisma.taskTypeConfig.findFirst({ where: { id, tenantId } });
  if (!taskType) throw new NotFoundError("Task type not found");
  return taskType;
}

export async function getTaskType(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateTaskTypeConfigInput extends Partial<TaskTypeConfigInput> {
  isActive?: boolean;
}

export async function updateTaskType(tenantId: string, id: string, input: UpdateTaskTypeConfigInput) {
  await findScoped(tenantId, id);
  if (input.code) await assertCodeAvailable(tenantId, input.code, id);
  return prisma.taskTypeConfig.update({ where: { id }, data: input });
}

export async function deactivateTaskType(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.taskTypeConfig.update({ where: { id }, data: { isActive: false } });
}
