import { apiRequest } from "./client";

export interface Station {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  city: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listStations() {
  return apiRequest<Station[]>("/stations");
}

export interface StationInput {
  code: string;
  name: string;
  city: string;
  address?: string;
}

export function createStation(input: StationInput) {
  return apiRequest<Station>("/stations", { method: "POST", body: input });
}

export function updateStation(id: string, input: Partial<StationInput> & { isActive?: boolean }) {
  return apiRequest<Station>(`/stations/${id}`, { method: "PATCH", body: input });
}

export function deactivateStation(id: string) {
  return apiRequest<void>(`/stations/${id}`, { method: "DELETE" });
}
