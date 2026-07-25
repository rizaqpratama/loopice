export const EXCEPTION_TYPES = [
  "CUSTOMER_UNAVAILABLE",
  "ADDRESS_NOT_FOUND",
  "ACCESS_RESTRICTED",
  "CARGO_DAMAGED",
  "CARGO_MISSING",
  "PARTIAL_QUANTITY",
  "VEHICLE_BREAKDOWN",
  "DRIVER_UNAVAILABLE",
  "FACILITY_CLOSED",
  "DELIVERY_REJECTED",
  "CAPACITY_EXCEEDED",
  "INCORRECT_CARGO",
  "MISSORT",
  "OTHER",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

export const EXCEPTION_STATUSES = ["OPEN", "ASSIGNED", "RESOLVED", "CLOSED"] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

// Open -> Assigned -> Resolved -> Closed, with Assigned skippable (an
// exception can be resolved directly by whoever opened it).
export const EXCEPTION_STATUS_TRANSITIONS: Record<ExceptionStatus, ExceptionStatus[]> = {
  OPEN: ["ASSIGNED", "RESOLVED"],
  ASSIGNED: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export function canTransitionExceptionStatus(from: ExceptionStatus, to: ExceptionStatus): boolean {
  return EXCEPTION_STATUS_TRANSITIONS[from].includes(to);
}
