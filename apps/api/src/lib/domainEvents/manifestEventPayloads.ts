export interface ManifestEventPayloads {
  "manifest.created": {
    manifestId: string;
    tenantId: string;
    manifestNumber: string;
    tripId: string;
  };
  "manifest.item_added": {
    manifestId: string;
    tenantId: string;
    itemId: string;
    shipmentId?: string;
    cargoItemId?: string;
  };
  "manifest.loading_started": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
  "manifest.item_loaded": {
    manifestId: string;
    tenantId: string;
    itemId: string;
    quantity?: number;
  };
  "manifest.verified": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
  "manifest.sealed": {
    manifestId: string;
    tenantId: string;
    sealNumber: string;
    tripId: string;
  };
  "manifest.unloading_started": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
  "manifest.item_received": {
    manifestId: string;
    tenantId: string;
    itemId: string;
    quantity?: number;
  };
  "manifest.receiving_completed": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
  "manifest.discrepancy_detected": {
    manifestId: string;
    tenantId: string;
    tripId: string;
    itemId?: string;
    discrepancyType: string;
  };
  "manifest.closed": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
  "manifest.dispatched": {
    manifestId: string;
    tenantId: string;
    tripId: string;
  };
}
