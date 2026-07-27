import type { VehicleStatus } from "@loopice/shared";
import { apiRequest } from "./client";
import type { Station } from "./stations.api";

export interface Vehicle {
  id: string;
  tenantId: string;
  plateNumber: string;
  type: string;
  capacityKg: number | null;
  capacityM3: number | null;
  capabilities: string[];
  status: VehicleStatus;
  homeStationId: string | null;
  homeStation: Station | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listVehicles(params: { search?: string; status?: VehicleStatus } = {}) {
  return apiRequest<Vehicle[]>("/vehicles", { params });
}

export interface VehicleInput {
  plateNumber: string;
  type: string;
  capacityKg?: number;
  capacityM3?: number;
  capabilities?: string[];
  homeStationId?: string;
  notes?: string;
}

export function createVehicle(input: VehicleInput) {
  return apiRequest<Vehicle>("/vehicles", { method: "POST", body: input });
}

export function updateVehicle(id: string, input: Partial<VehicleInput> & { status?: VehicleStatus }) {
  return apiRequest<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: input });
}

export function deactivateVehicle(id: string) {
  return apiRequest<void>(`/vehicles/${id}`, { method: "DELETE" });
}
