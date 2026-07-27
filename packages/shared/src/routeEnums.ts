export const ROUTE_SOURCES = [
  "MANUAL",
  "SYSTEM_SUGGESTED",
  "OPTIMIZED",
  "IMPORTED",
  "RECALCULATED",
] as const;
export type RouteSource = (typeof ROUTE_SOURCES)[number];

export const ROUTE_STATUSES = [
  "DRAFT",
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "SUPERSEDED",
  "CANCELLED",
] as const;
export type RouteStatus = (typeof ROUTE_STATUSES)[number];

export const ROUTE_STATUS_TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  DRAFT: ["PLANNED", "CANCELLED"],
  PLANNED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "SUPERSEDED", "CANCELLED"],
  COMPLETED: [],
  SUPERSEDED: [],
  CANCELLED: [],
};

export function canTransitionRouteStatus(from: RouteStatus, to: RouteStatus): boolean {
  return ROUTE_STATUS_TRANSITIONS[from].includes(to);
}

export const ROUTE_STOP_TYPES = [
  "DEPOT_START",
  "DEPOT_END",
  "PICKUP",
  "DELIVERY",
  "PICKUP_AND_DELIVERY",
  "ORIGIN_FACILITY",
  "DESTINATION_FACILITY",
  "INTERMEDIATE_FACILITY",
  "FACILITY",
  "BREAK",
  "FUEL",
  "CHECKPOINT",
  "OTHER",
] as const;
export type RouteStopType = (typeof ROUTE_STOP_TYPES)[number];

export const ROUTE_STOP_STATUSES = [
  "PLANNED",
  "SKIPPED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type RouteStopStatus = (typeof ROUTE_STOP_STATUSES)[number];

export const ROUTE_STOP_STATUS_TRANSITIONS: Record<RouteStopStatus, RouteStopStatus[]> = {
  PLANNED: ["SKIPPED", "EN_ROUTE", "CANCELLED"],
  SKIPPED: [],
  EN_ROUTE: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  PARTIALLY_COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionRouteStopStatus(
  from: RouteStopStatus,
  to: RouteStopStatus
): boolean {
  return ROUTE_STOP_STATUS_TRANSITIONS[from].includes(to);
}

export const ROUTE_STOP_TASK_ASSIGNMENT_STATUSES = [
  "PLANNED",
  "ASSIGNED",
  "REMOVED",
  "COMPLETED",
  "FAILED",
] as const;
export type RouteStopTaskAssignmentStatus = (typeof ROUTE_STOP_TASK_ASSIGNMENT_STATUSES)[number];
