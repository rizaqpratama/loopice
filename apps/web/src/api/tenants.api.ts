import type { TenantBranding } from "@loopice/shared";
import { apiRequest } from "./client";

export function getBranding() {
  return apiRequest<TenantBranding>("/tenants/branding", { auth: false });
}

export function getMyTenant() {
  return apiRequest<TenantBranding>("/tenants/me");
}

export interface UpdateTenantBrandingInput {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export function updateMyTenant(input: UpdateTenantBrandingInput) {
  return apiRequest<TenantBranding>("/tenants/me", { method: "PATCH", body: input });
}
