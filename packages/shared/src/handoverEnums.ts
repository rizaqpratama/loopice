export const HANDOVER_TYPES = [
  "ORIGIN_TO_DRIVER",
  "DRIVER_TO_DESTINATION",
  "FACILITY_TO_PARTNER",
  "PARTNER_TO_FACILITY",
  "OTHER",
] as const;
export type HandoverType = (typeof HANDOVER_TYPES)[number];

export const HANDOVER_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "ACCEPTED",
  "ACCEPTED_WITH_EXCEPTION",
  "REJECTED",
  "CANCELLED",
] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export const HANDOVER_STATUS_TRANSITIONS: Record<HandoverStatus, HandoverStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["ACCEPTED", "ACCEPTED_WITH_EXCEPTION", "REJECTED"],
  ACCEPTED: [],
  ACCEPTED_WITH_EXCEPTION: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionHandoverStatus(
  from: HandoverStatus,
  to: HandoverStatus
): boolean {
  return HANDOVER_STATUS_TRANSITIONS[from].includes(to);
}

export const HANDOVER_ACTOR_TYPES = ["FACILITY", "DRIVER", "PARTNER", "SYSTEM"] as const;
export type HandoverActorType = (typeof HANDOVER_ACTOR_TYPES)[number];
