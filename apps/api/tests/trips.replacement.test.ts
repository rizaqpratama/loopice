import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createTrip, request } from "./helpers";

describe("replacement trip: maintains chain-of-custody and lineage", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("creates replacement trip with parentTripId chain", async () => {
    // TODO: create trip A with manifest + items
    // TODO: create replacement B, verify B.parentTripId=A.id, A.replacementTripId=B.id
  });

  it("carries forward undelivered items via sourceManifestItemId", async () => {
    // TODO: trip A with 3 items, receive 1, create replacement B
    // TODO: verify B's manifest has 2 items with sourceManifestItemId pointing to A's items
  });

  it("excludes already-received items from replacement manifest", async () => {
    // TODO: verify received item does not appear in replacement manifest
  });

  it("copies route stops to replacement (excluding completed stops)", async () => {
    // TODO: trip A with 5 stops, 2 completed, create replacement B
    // TODO: verify B's route has remaining 3 stops
  });

  it("gated to OPERATIONS_MANAGER only (not general DISPATCHER)", async () => {
    // TODO: fail trip as DISPATCHER, attempt replacement, expect 403
    // TODO: fail trip as OPERATIONS_MANAGER, create replacement, expect 200
  });
});
