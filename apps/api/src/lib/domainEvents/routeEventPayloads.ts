export interface RouteEventPayloads {
  "route.created": {
    routeId: string;
    tenantId: string;
    routeNumber: string;
  };
  "route.activated": {
    routeId: string;
    tenantId: string;
    tripId?: string;
  };
  "route.resequenced": {
    routeId: string;
    tenantId: string;
  };
  "stop.arrived": {
    routeStopId: string;
    routeId: string;
    tenantId: string;
    sequenceNumber: number;
  };
  "stop.completed": {
    routeStopId: string;
    routeId: string;
    tenantId: string;
    sequenceNumber: number;
  };
  "stop.failed": {
    routeStopId: string;
    routeId: string;
    tenantId: string;
    sequenceNumber: number;
  };
  "destination_facility.arrived": {
    tripId: string;
    destinationFacilityId: string;
    tenantId: string;
  };
}
