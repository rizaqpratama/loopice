// Small flat enums used by Task and TaskTypeConfig that don't have their
// own transition graph -- kept in one file to avoid fragmenting into
// several near-empty modules.

export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_LOCATION_TYPES = [
  "FACILITY",
  "CUSTOMER_ADDRESS",
  "PARTNER_ADDRESS",
  "CUSTOM",
] as const;
export type TaskLocationType = (typeof TASK_LOCATION_TYPES)[number];

export const ASSIGNEE_TYPES = ["DRIVER", "VEHICLE", "STAFF", "TEAM", "PARTNER"] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

export const LOCATION_REQUIREMENTS = [
  "NONE",
  "FACILITY_ONLY",
  "CUSTOMER_ADDRESS_ONLY",
  "ANY",
] as const;
export type LocationRequirement = (typeof LOCATION_REQUIREMENTS)[number];

export const CARGO_REQUIREMENTS = ["NONE", "OPTIONAL", "REQUIRED"] as const;
export type CargoRequirement = (typeof CARGO_REQUIREMENTS)[number];
