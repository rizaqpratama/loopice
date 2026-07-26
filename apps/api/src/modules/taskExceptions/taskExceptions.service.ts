import { canTransitionExceptionStatus, type ExceptionSeverity, type ExceptionStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { BadRequestError, NotFoundError } from "../../lib/httpError";
import { SAFE_USER_SELECT } from "../../lib/safeUserSelect";

const EXCEPTION_INCLUDE = {
  task: true,
  reportedBy: { select: SAFE_USER_SELECT },
  assignedTo: { select: SAFE_USER_SELECT },
  resolvedBy: { select: SAFE_USER_SELECT },
  closedBy: { select: SAFE_USER_SELECT },
  followUpTask: true,
} satisfies Prisma.TaskExceptionInclude;

async function findScoped(tenantId: string, id: string) {
  const exception = await prisma.taskException.findFirst({
    where: { id, tenantId },
    include: EXCEPTION_INCLUDE,
  });
  if (!exception) throw new NotFoundError("Exception not found");
  return exception;
}

export async function getException(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateExceptionInput {
  severity?: ExceptionSeverity;
  status?: ExceptionStatus;
  assignedToId?: string | null;
  resolution?: string;
  followUpTaskId?: string;
}

export async function updateException(
  tenantId: string,
  id: string,
  input: UpdateExceptionInput,
  actorId: string | null
) {
  const exception = await findScoped(tenantId, id);

  if (input.assignedToId) {
    const user = await prisma.user.findFirst({ where: { id: input.assignedToId, tenantId } });
    if (!user) throw new BadRequestError("Assignee does not belong to this tenant");
  }
  if (input.followUpTaskId) {
    const task = await prisma.task.findFirst({ where: { id: input.followUpTaskId, tenantId } });
    if (!task) throw new BadRequestError("Follow-up task does not belong to this tenant");
  }

  const data: Prisma.TaskExceptionUpdateInput = {
    severity: input.severity,
    resolution: input.resolution,
  };
  if (input.assignedToId !== undefined) {
    data.assignedTo = input.assignedToId ? { connect: { id: input.assignedToId } } : { disconnect: true };
  }
  if (input.followUpTaskId) {
    data.followUpTask = { connect: { id: input.followUpTaskId } };
  }

  if (input.status && input.status !== exception.status) {
    if (!canTransitionExceptionStatus(exception.status, input.status)) {
      throw new BadRequestError(`Cannot transition exception from ${exception.status} to ${input.status}`);
    }
    if (input.status === "RESOLVED" && !(input.resolution || exception.resolution)) {
      throw new BadRequestError("resolution is required to resolve an exception");
    }
    data.status = input.status;
    if (input.status === "RESOLVED") {
      if (actorId) data.resolvedBy = { connect: { id: actorId } };
      data.resolvedAt = new Date();
    }
    if (input.status === "CLOSED") {
      if (actorId) data.closedBy = { connect: { id: actorId } };
      data.closedAt = new Date();
    }
  }

  const updated = await prisma.taskException.update({ where: { id }, data, include: EXCEPTION_INCLUDE });
  if (input.status === "RESOLVED" && exception.status !== "RESOLVED") {
    domainEvents.emitTyped("task.exception_resolved", {
      taskId: exception.taskId ?? undefined,
      tripId: exception.tripId ?? undefined,
      manifestId: exception.manifestId ?? undefined,
      tenantId,
      exceptionId: exception.id,
    });
  }
  return updated;
}
