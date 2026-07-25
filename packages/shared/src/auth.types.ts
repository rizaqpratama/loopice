import type { UserRole } from "./roles";

export interface JwtPayload {
  userId: string;
  tenantId: string | null;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface TenantBranding {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}
