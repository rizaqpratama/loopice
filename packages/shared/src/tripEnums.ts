export const TRIP_TYPES = [
  "DIRECT_DELIVERY",
  "PICKUP_RUN",
  "DELIVERY_RUN",
  "PICKUP_AND_DELIVERY",
  "MILK_RUN",
  "LINEHAUL",
  "INTER_FACILITY",
  "INTER_HUB",
  "WAREHOUSE_TRANSFER",
  "BRANCH_TRANSFER",
  "DEPOT_TRANSFER",
  "CROSS_DOCK_TRANSFER",
  "FACILITY_TRANSFER",
  "RETURN_TRIP",
  "VEHICLE_REPOSITIONING",
  "AD_HOC",
  "OTHER",
] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const TRANSFER_TYPES = [
  "INTER_HUB",
  "WAREHOUSE_TRANSFER",
  "BRANCH_TRANSFER",
  "DEPOT_TRANSFER",
  "CROSS_DOCK_TRANSFER",
  "STOCK_REBALANCING",
  "RETURN_TO_ORIGIN",
  "VEHICLE_REPOSITIONING",
  "OTHER",
] as const;
export type TransferType = (typeof TRANSFER_TYPES)[number];

export const TRIP_STATUSES = [
  "DRAFT",
  "PLANNING",
  "READY",
  "DISPATCHED",
  "IN_PROGRESS",
  "PAUSED",
  "ARRIVED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// A trip moves through planning (DRAFT→PLANNING→READY), then dispatch (DISPATCHED),
// then execution (IN_PROGRESS, optionally PAUSED, then ARRIVED), then completion.
// COMPLETED means the vehicle journey is done, not necessarily cargo receiving/reconciliation.
// CANCELLED is reachable from any pre-DISPATCHED state.
export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  DRAFT: ["PLANNING", "CANCELLED"],
  PLANNING: ["READY", "CANCELLED"],
  READY: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_PROGRESS"],
  IN_PROGRESS: ["PAUSED", "ARRIVED", "PARTIALLY_COMPLETED", "FAILED"],
  PAUSED: ["IN_PROGRESS"],
  ARRIVED: ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED"],
  COMPLETED: [],
  PARTIALLY_COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionTripStatus(from: TripStatus, to: TripStatus): boolean {
  return TRIP_STATUS_TRANSITIONS[from].includes(to);
}
