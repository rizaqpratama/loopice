export interface HandoverEventPayloads {
  "handover.origin_accepted": {
    handoverId: string;
    tripId: string;
    manifestId: string;
    tenantId: string;
    acceptedByActorType: string;
    acceptedByActorId?: string;
  };
  "handover.destination_accepted": {
    handoverId: string;
    tripId: string;
    manifestId: string;
    tenantId: string;
    acceptedByActorType: string;
    acceptedByActorId?: string;
  };
}
