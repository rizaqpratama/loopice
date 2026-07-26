import type { TripStatus } from "@loopice/shared";
import { apiRequest } from "./client";
import type { Driver } from "./drivers.api";
import type { Vehicle } from "./vehicles.api";

export interface TripTaskSummary {
  id: string;
  taskNumber: string;
  status: string;
  sequenceNumber: number | null;
}

export interface RouteSummary {
  id: string;
  name: string;
  code: string | null;
}

export interface Trip {
  id: string;
  tenantId: string;
  tripNumber: string;
  tripType: string;
  status: TripStatus;
  routeId: string | null;
  route: RouteSummary | null;
  primaryDriverId: string | null;
  primaryDriver: Driver | null;
  vehicleId: string | null;
  vehicle: Vehicle | null;
  originFacilityId: string | null;
  destinationFacilityId: string | null;
  manifest: any;
  tasks: TripTaskSummary[];
  statusHistory: any[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function listTrips(params: { status?: TripStatus; driverId?: string; vehicleId?: string; skip?: number; take?: number } = {}) {
  return apiRequest<Trip[]>("/trips", { params });
}

export interface TripInput {
  tripType?: string;
  vehicleId?: string;
  primaryDriverId?: string;
  scheduledDate?: string;
  notes?: string;
}

export function createTrip(input: TripInput) {
  return apiRequest<Trip>("/trips", { method: "POST", body: input });
}

export function getTrip(id: string) {
  return apiRequest<Trip>(`/trips/${id}`);
}

export function updateTrip(id: string, input: Partial<TripInput>) {
  return apiRequest<Trip>(`/trips/${id}`, { method: "PATCH", body: input });
}

export function updateTripStatus(id: string, status: TripStatus) {
  return apiRequest<Trip>(`/trips/${id}/status`, { method: "PATCH", body: { status } });
}

export function addTaskToTrip(tripId: string, taskId: string) {
  return apiRequest<Trip>(`/trips/${tripId}/tasks/${taskId}`, { method: "PATCH" });
}

export function removeTaskFromTrip(tripId: string, taskId: string) {
  return apiRequest<Trip>(`/trips/${tripId}/tasks/${taskId}`, { method: "DELETE" });
}

export function createReplacementTrip(id: string, data: any) {
  return apiRequest<Trip>(`/trips/${id}/replacement`, { method: "POST", body: data });
}
