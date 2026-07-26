import { beforeAll, describe, expect, it } from "vitest";
import { adminToken, authed, createRoute, request } from "./helpers";

describe("route versioning: new version copies stops, activate supersedes prior version", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("creates new route version copying stops from prior version", async () => {
    // TODO: create route v1 with 3 stops
    // TODO: create new version, verify stops copied
    // TODO: verify v1.isActive=true, v2.isActive=false
  });

  it("activating new version supersedes prior version", async () => {
    // TODO: activate v2, verify v1.status=SUPERSEDED, v2.status=ACTIVE, isActive flags flip
  });

  it("allows editing stops in draft version without affecting active version", async () => {
    // TODO: create v1 (active), v2 (draft)
    // TODO: edit stop in v2, verify v1 unchanged
  });
});
