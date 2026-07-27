export interface ReconciliationEventPayloads {
  "reconciliation.started": {
    reconciliationId: string;
    tripId: string;
    manifestId: string;
    tenantId: string;
    destinationFacilityId: string;
  };
  "reconciliation.completed": {
    reconciliationId: string;
    tripId: string;
    manifestId: string;
    tenantId: string;
    status: string;
    matchedItemCount: number;
    missingItemCount: number;
    excessItemCount: number;
    damagedItemCount: number;
    unidentifiedItemCount: number;
  };
}
