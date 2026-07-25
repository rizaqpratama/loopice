export const TASK_STATUSES = [
  "DRAFT",
  "UNASSIGNED",
  "ASSIGNED",
  "PLANNED",
  "READY",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "FAILED",
  "RESCHEDULED",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// PARTIALLY_COMPLETED, COMPLETED, and CANCELLED are all terminal -- once
// there, corrective work happens via a new Task (see TaskException.
// followUpTaskId), not by reopening this one.
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  DRAFT: ["UNASSIGNED", "CANCELLED"],
  UNASSIGNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PLANNED", "UNASSIGNED", "CANCELLED"],
  PLANNED: ["READY", "ASSIGNED", "CANCELLED"],
  READY: ["EN_ROUTE", "RESCHEDULED", "CANCELLED"],
  EN_ROUTE: ["ARRIVED", "FAILED", "RESCHEDULED"],
  ARRIVED: ["IN_PROGRESS", "FAILED"],
  IN_PROGRESS: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED"],
  PARTIALLY_COMPLETED: [],
  COMPLETED: [],
  FAILED: ["RESCHEDULED"],
  RESCHEDULED: ["ASSIGNED", "PLANNED", "READY", "UNASSIGNED", "CANCELLED"],
  CANCELLED: [],
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATUS_TRANSITIONS[from].includes(to);
}
