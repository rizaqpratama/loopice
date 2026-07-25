export const USER_ROLES = ["SUPERADMIN", "TENANT_ADMIN", "DISPATCHER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TENANT_SCOPED_ROLES: UserRole[] = ["TENANT_ADMIN", "DISPATCHER"];
