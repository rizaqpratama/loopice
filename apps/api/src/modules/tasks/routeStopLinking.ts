import type { Prisma } from "@prisma/client";

// The single entry point for keeping Task.tripId/routeId/stopId (the
// denormalized "current assignment" mirror, read by dispatch-board/task-
// filter queries) in sync with RouteStopTask (the historized junction --
// source of truth for stop<->task assignment audit trail). Both writes must
// happen in one caller-supplied transaction so they can never drift.
//
// Uniqueness of "at most one active assignment per task" is enforced by the
// partial unique index RouteStopTask_active_taskId_key (see the Phase 0
// migration) -- callers should catch the resulting P2002 rather than
// pre-checking with a separate findFirst, which is a check-then-create race.

export interface LinkTaskToRouteStopInput {
  tenantId: string;
  taskId: string;
  routeStopId: string;
  tripId?: string | null;
  routeId?: string | null;
  userId: string | null;
}

export async function linkTaskToRouteStop(
  tx: Prisma.TransactionClient,
  input: LinkTaskToRouteStopInput
) {
  const link = await tx.routeStopTask.create({
    data: {
      tenantId: input.tenantId,
      routeStopId: input.routeStopId,
      taskId: input.taskId,
      assignmentStatus: "ASSIGNED",
      assignedAt: new Date(),
      createdById: input.userId ?? undefined,
    },
    include: { task: true },
  });

  await tx.task.update({
    where: { id: input.taskId },
    data: {
      tripId: input.tripId ?? undefined,
      routeId: input.routeId ?? undefined,
      stopId: input.routeStopId,
    },
  });

  return link;
}

export interface UnlinkTaskFromRouteStopInput {
  tenantId: string;
  taskId: string;
  routeStopId?: string;
  removalReason?: string;
  // Stop-only unlink (routePlans.service.ts's unlinkTaskFromStop) clears
  // just stopId, so the task can be relinked to a different stop on the
  // same trip. Full removal from the trip (tasks.service.ts's unassignTask,
  // trips.service.ts's removeTaskFromTrip) also clears tripId/routeId.
  clearTripAssignment?: boolean;
}

export async function unlinkTaskFromRouteStop(
  tx: Prisma.TransactionClient,
  input: UnlinkTaskFromRouteStopInput
) {
  const link = await tx.routeStopTask.findFirst({
    where: {
      tenantId: input.tenantId,
      taskId: input.taskId,
      ...(input.routeStopId ? { routeStopId: input.routeStopId } : {}),
      assignmentStatus: { in: ["PLANNED", "ASSIGNED"] },
    },
  });

  if (link) {
    await tx.routeStopTask.update({
      where: { id: link.id },
      data: {
        assignmentStatus: "REMOVED",
        removedAt: new Date(),
        removalReason: input.removalReason,
      },
    });
  }

  await tx.task.update({
    where: { id: input.taskId },
    data: input.clearTripAssignment
      ? { tripId: null, routeId: null, stopId: null }
      : { stopId: null },
  });

  return link;
}
