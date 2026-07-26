import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createTrip, request } from "./helpers";

describe("trip dispatch validation: cannot dispatch without required conditions", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("rejects dispatch when no primary driver assigned", async () => {
    const trip = await createTrip(token, { tripType: "INTER_FACILITY" });

    const dispatch = await request
      .patch(`/api/trips/${trip.id}/status`)
      .set(authed(token))
      .send({ status: "DISPATCHED", expectedVersion: trip.version });

    expect(dispatch.status).toBe(400);
  });

  it("rejects dispatch when manifest is unsealed", async () => {
    // TODO: create trip with manifest, attempt dispatch without seal
  });

  it("rejects dispatch when hard capacity is exceeded", async () => {
    // TODO: create trip with vehicle, add manifest items exceeding capacity
  });

  it("allows dispatch with authorized capacity override + reason", async () => {
    // TODO: create trip, override capacity with reason, verify dispatch succeeds
  });
});
