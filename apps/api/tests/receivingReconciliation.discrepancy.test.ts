import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createReconciliation, request } from "./helpers";

describe("receiving reconciliation: discrepancy detection and task spawning", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("detects missing items and marks reconciliation DISCREPANCY", async () => {
    // TODO: create manifest with 3 items, receive only 2, complete reconciliation
    // TODO: verify status=DISCREPANCY, missingItemCount=1
  });

  it("counts excess items correctly", async () => {
    // TODO: receive 5 items when 3 expected, verify excessItemCount=2
  });

  it("spawns TaskException(manifestId) on discrepancy detection", async () => {
    // TODO: complete reconciliation with discrepancy, query /task-exceptions with manifestId filter
    // TODO: verify exception.taskId is null, exception.manifestId set
  });

  it("optionally creates follow-up task with HIGH priority", async () => {
    // TODO: spawn discrepancy task, verify Task created with UNASSIGNED status + HIGH priority
  });

  it("requires FACILITY_SUPERVISOR to complete DISCREPANCY reconciliation", async () => {
    // TODO: complete discrepancy recon as WAREHOUSE_STAFF, expect 403
    // TODO: complete as FACILITY_SUPERVISOR, expect 200
  });

  it("sets billingHold and claimReference on exception", async () => {
    // TODO: spawn exception with claimReference + billingHold=true
    // TODO: verify exception record
  });
});
