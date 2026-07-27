export const DISCREPANCY_TYPES = [
  "MISSING",
  "EXCESS",
  "DAMAGED",
  "PARTIAL_QUANTITY",
  "INCORRECT_CARGO",
  "MISSORT",
  "UNIDENTIFIED",
  "SEAL_BROKEN",
  "DOCUMENT_MISMATCH",
  "OTHER",
] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];
