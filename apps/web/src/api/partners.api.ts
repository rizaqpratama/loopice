import { apiRequest } from "./client";

export interface Partner {
  id: string;
  tenantId: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  type: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function listPartners(search?: string) {
  return apiRequest<Partner[]>("/partners", { params: { search } });
}

export interface PartnerInput {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  type?: string;
  notes?: string;
}

export function createPartner(input: PartnerInput) {
  return apiRequest<Partner>("/partners", { method: "POST", body: input });
}

export function updatePartner(id: string, input: Partial<PartnerInput> & { isActive?: boolean }) {
  return apiRequest<Partner>(`/partners/${id}`, { method: "PATCH", body: input });
}

export function deactivatePartner(id: string) {
  return apiRequest<void>(`/partners/${id}`, { method: "DELETE" });
}
