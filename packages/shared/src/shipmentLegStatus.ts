export const SHIPMENT_LEG_STATUSES = ["PLANNED", "IN_TRANSIT", "ARRIVED", "CANCELLED"] as const;
export type ShipmentLegStatus = (typeof SHIPMENT_LEG_STATUSES)[number];

// A leg is PLANNED, then physically moves (IN_TRANSIT), then ARRIVED.
// CANCELLED is only reachable from PLANNED -- once a leg is in transit,
// the movement is already happening and only proceeds forward.
export const SHIPMENT_LEG_STATUS_TRANSITIONS: Record<ShipmentLegStatus, ShipmentLegStatus[]> = {
  PLANNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["ARRIVED"],
  ARRIVED: [],
  CANCELLED: [],
};

export function canTransitionShipmentLegStatus(
  from: ShipmentLegStatus,
  to: ShipmentLegStatus
): boolean {
  return SHIPMENT_LEG_STATUS_TRANSITIONS[from].includes(to);
}
