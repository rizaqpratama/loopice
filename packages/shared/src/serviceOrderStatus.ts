export const SERVICE_ORDER_STATUSES = [
  "DRAFT",
  "QUOTED",
  "CONFIRMED",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "BILLED",
  "CLOSED",
  "CANCELLED",
] as const;
export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number];

// Linear lifecycle, one stage at a time. CANCELLED is only reachable before
// work physically starts (DRAFT/QUOTED/CONFIRMED/PLANNED) -- once
// IN_PROGRESS or later, the job is already underway and only proceeds
// forward. COMPLETED/BILLED/CLOSED/CANCELLED are terminal.
export const SERVICE_ORDER_STATUS_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  DRAFT: ["QUOTED", "CANCELLED"],
  QUOTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PLANNED", "CANCELLED"],
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["BILLED"],
  BILLED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionServiceOrderStatus(
  from: ServiceOrderStatus,
  to: ServiceOrderStatus
): boolean {
  return SERVICE_ORDER_STATUS_TRANSITIONS[from].includes(to);
}
