export const MANIFEST_STATUSES = [
  "DRAFT",
  "PLANNED",
  "LOADING",
  "LOADED",
  "SEALED",
  "DISPATCHED",
  "IN_TRANSIT",
  "ARRIVED",
  "UNLOADING",
  "RECEIVING",
  "RECONCILING",
  "MATCHED",
  "DISCREPANCY",
  "CLOSED",
  "CANCELLED",
] as const;
export type ManifestStatus = (typeof MANIFEST_STATUSES)[number];

// Manifest follows a linear progression from creation through dispatch, transit,
// receiving, and reconciliation. CANCELLED is reachable from any pre-DISPATCHED state.
// DISCREPANCY is a non-terminal state that can proceed to CLOSED after resolution.
export const MANIFEST_STATUS_TRANSITIONS: Record<ManifestStatus, ManifestStatus[]> = {
  DRAFT: ["PLANNED", "CANCELLED"],
  PLANNED: ["LOADING", "CANCELLED"],
  LOADING: ["LOADED", "CANCELLED"],
  LOADED: ["SEALED", "CANCELLED"],
  SEALED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED"],
  ARRIVED: ["UNLOADING"],
  UNLOADING: ["RECEIVING"],
  RECEIVING: ["RECONCILING"],
  RECONCILING: ["MATCHED", "DISCREPANCY"],
  MATCHED: ["CLOSED"],
  DISCREPANCY: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionManifestStatus(
  from: ManifestStatus,
  to: ManifestStatus
): boolean {
  return MANIFEST_STATUS_TRANSITIONS[from].includes(to);
}

export const MANIFEST_ITEM_TYPES = [
  "SHIPMENT",
  "PARCEL",
  "CARTON",
  "PALLET",
  "CONTAINER",
  "BAG",
  "CAGE",
  "LOOSE_CARGO",
  "DOCUMENT",
  "OTHER",
] as const;
export type ManifestItemType = (typeof MANIFEST_ITEM_TYPES)[number];

export const MANIFEST_ITEM_LOADING_STATUSES = [
  "PLANNED",
  "SCANNED",
  "LOADED",
  "MISSING",
  "REMOVED",
  "DAMAGED",
] as const;
export type ManifestItemLoadingStatus = (typeof MANIFEST_ITEM_LOADING_STATUSES)[number];

export const MANIFEST_ITEM_RECEIVING_STATUSES = [
  "PENDING",
  "RECEIVED",
  "PARTIALLY_RECEIVED",
  "MISSING",
  "DAMAGED",
  "EXCESS",
  "UNIDENTIFIED",
] as const;
export type ManifestItemReceivingStatus = (typeof MANIFEST_ITEM_RECEIVING_STATUSES)[number];
