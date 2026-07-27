export const SHIPMENT_TYPES = ["PALLET", "CONTAINER", "PARCEL"] as const;
export type ShipmentType = (typeof SHIPMENT_TYPES)[number];
