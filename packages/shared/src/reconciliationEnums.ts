export const RECONCILIATION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "MATCHED",
  "PARTIAL",
  "DISCREPANCY",
  "UNDER_INVESTIGATION",
  "RESOLVED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const RECONCILIATION_STATUS_TRANSITIONS: Record<ReconciliationStatus, ReconciliationStatus[]> =
  {
    PENDING: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["MATCHED", "PARTIAL", "DISCREPANCY", "CANCELLED"],
    MATCHED: ["COMPLETED"],
    PARTIAL: ["UNDER_INVESTIGATION", "COMPLETED"],
    DISCREPANCY: ["UNDER_INVESTIGATION", "RESOLVED"],
    UNDER_INVESTIGATION: ["RESOLVED", "COMPLETED"],
    RESOLVED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };

export function canTransitionReconciliationStatus(
  from: ReconciliationStatus,
  to: ReconciliationStatus
): boolean {
  return RECONCILIATION_STATUS_TRANSITIONS[from].includes(to);
}
