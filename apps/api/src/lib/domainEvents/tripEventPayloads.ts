import type { TripType, TransferType, TripStatus } from "@loopice/shared";

export interface TripEventPayloads {
  "trip.created": {
    tripId: string;
    tenantId: string;
    tripNumber: string;
    tripType: TripType;
  };
  "trip.facility_transfer_created": {
    tripId: string;
    tenantId: string;
    originFacilityId: string;
    destinationFacilityId: string;
  };
  "trip.updated": {
    tripId: string;
    tenantId: string;
  };
  "trip.vehicle_assigned": {
    tripId: string;
    tenantId: string;
    vehicleId: string;
  };
  "trip.driver_assigned": {
    tripId: string;
    tenantId: string;
    driverId: string;
    isPrimary: boolean;
  };
  "trip.task_added": {
    tripId: string;
    tenantId: string;
    taskId: string;
  };
  "trip.task_removed": {
    tripId: string;
    tenantId: string;
    taskId: string;
  };
  "trip.ready": {
    tripId: string;
    tenantId: string;
  };
  "trip.dispatched": {
    tripId: string;
    tenantId: string;
  };
  "trip.started": {
    tripId: string;
    tenantId: string;
  };
  "trip.paused": {
    tripId: string;
    tenantId: string;
  };
  "trip.resumed": {
    tripId: string;
    tenantId: string;
  };
  "trip.completed": {
    tripId: string;
    tenantId: string;
  };
  "trip.partially_completed": {
    tripId: string;
    tenantId: string;
  };
  "trip.failed": {
    tripId: string;
    tenantId: string;
  };
  "trip.cancelled": {
    tripId: string;
    tenantId: string;
  };
  "trip.delayed": {
    tripId: string;
    tenantId: string;
    delayMinutes: number;
  };
  "trip.capacity_exceeded": {
    tripId: string;
    tenantId: string;
  };
  "trip.exception_created": {
    tripId: string;
    tenantId: string;
    exceptionId: string;
  };
  "trip.replacement_created": {
    originalTripId: string;
    replacementTripId: string;
    tenantId: string;
    reason: string;
  };
  "trip.status_changed": {
    tripId: string;
    tenantId: string;
    from: TripStatus;
    to: TripStatus;
  };
}
