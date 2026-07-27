import { canTransitionTaskStatus, type TaskStatus } from "./taskStatus";

// The entire "status can differ by task type" mechanism: static transition
// edges (taskStatus.ts) filtered by a per-type allow-list. Deliberately not
// a rules engine -- an empty allowedStatuses list means "all 13 allowed".
export interface TaskTypeStatusConfig {
  allowedStatuses: TaskStatus[];
}

export function canTransitionTaskStatusForType(
  config: TaskTypeStatusConfig,
  from: TaskStatus,
  to: TaskStatus
): boolean {
  if (!canTransitionTaskStatus(from, to)) return false;
  return config.allowedStatuses.length === 0 || config.allowedStatuses.includes(to);
}
