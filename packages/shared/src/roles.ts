export const USER_ROLES = [
  "SUPERADMIN",
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "DRIVER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TENANT_SCOPED_ROLES: UserRole[] = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "DRIVER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
];

// Roles whose task visibility is scoped to only their own assigned rows
// (checked via assertOwnsOrPrivileged in the API), not just role-gated.
export const TASK_MOBILE_ROLES: UserRole[] = ["DRIVER"];
