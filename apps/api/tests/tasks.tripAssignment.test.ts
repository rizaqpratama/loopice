import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createTask, createTrip, request } from "./helpers";

describe("task-to-trip assignment validation: pick-before-deliver, loading to origin, etc.", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("rejects assigning non-routeable task to a trip", async () => {
    // TODO: create ADMIN task, attempt assign to trip, expect 400
  });

  it("rejects assigning loading task to non-origin stop", async () => {
    // TODO: create trip with route (origin -> dest), LOADING task, link to dest stop, expect 400
  });

  it("rejects assign when task already active on another trip", async () => {
    // TODO: create task, assign to trip1, attempt assign to trip2, expect 409/400
  });

  it("enforces pickup-before-delivery for same-shipment tasks", async () => {
    // TODO: create two tasks (pickup + delivery) for same shipment, reverse order, expect 400
  });
});
