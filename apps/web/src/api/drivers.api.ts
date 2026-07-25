import type { DriverStatus } from "@loopice/shared";
import { apiRequest } from "./client";
import type { Station } from "./stations.api";

export interface Driver {
  id: string;
  tenantId: string;
  userId: string | null;
  name: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  phone: string | null;
  status: DriverStatus;
  skills: string[];
  homeStationId: string | null;
  homeStation: Station | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listDrivers(params: { search?: string; status?: DriverStatus } = {}) {
  return apiRequest<Driver[]>("/drivers", { params });
}

export interface DriverInput {
  userId?: string;
  name: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  phone?: string;
  skills?: string[];
  homeStationId?: string;
  notes?: string;
}

export function createDriver(input: DriverInput) {
  return apiRequest<Driver>("/drivers", { method: "POST", body: input });
}

export function updateDriver(id: string, input: Partial<DriverInput> & { status?: DriverStatus }) {
  return apiRequest<Driver>(`/drivers/${id}`, { method: "PATCH", body: input });
}

export function deactivateDriver(id: string) {
  return apiRequest<void>(`/drivers/${id}`, { method: "DELETE" });
}
