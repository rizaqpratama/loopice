import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createManifest, request } from "./helpers";

describe("manifest capacity: hard-block vs soft-warning vs authorized override", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("hard-blocks manifest when load exceeds vehicle capacity", async () => {
    // TODO: create trip with small vehicle, manifest items > capacity
    // TODO: attempt seal without override, expect 400
  });

  it("warns but allows soft-cap overrun when override reason provided", async () => {
    // TODO: exceed soft capacity (e.g., 90%), seal with reason, expect 200
  });

  it("rejects override without reason", async () => {
    // TODO: exceed capacity, seal with override=true but no reason, expect 400
  });

  it("records override reason in audit log", async () => {
    // TODO: seal with override + reason, query audit log, verify action + reason captured
  });
});
