import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createTrip, request } from "./helpers";

describe("idempotency: replaying same clientRequestId is a no-op", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("manifest seal is idempotent via clientRequestId", async () => {
    // TODO: seal manifest with clientRequestId=X, verify sealedAt set
    // TODO: seal again with same clientRequestId, verify same sealedAt (no double-increment)
  });

  it("dispatch is idempotent via clientRequestId", async () => {
    // TODO: dispatch trip with clientRequestId=X, verify Trip.status=DISPATCHED
    // TODO: dispatch again with same clientRequestId, expect same result (409 or no-op 200)
  });

  it("record-counts is idempotent via clientRequestId", async () => {
    // TODO: record 2 items received with clientRequestId=X
    // TODO: record again with same clientRequestId, verify counts unchanged
  });

  it("prevents accidental double-execution of status transitions", async () => {
    // TODO: verify unique(entityId, clientRequestId) constraint on history table
    // TODO: violating it returns 409 ConflictError or idempotent 200
  });
});
