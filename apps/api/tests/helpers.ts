import supertest from "supertest";
import { app } from "../src/app";

export const request = supertest(app);

export const TENANT_HEADER = "X-Tenant-Subdomain";
export const TENANT_SUBDOMAIN = "acme";

export const ADMIN_CREDENTIALS = { email: "admin@acme.test", password: "Password123!" };
export const DISPATCHER_CREDENTIALS = { email: "dispatcher@acme.test", password: "Password123!" };

export async function loginAs(email: string, password: string): Promise<string> {
  const res = await request
    .post("/api/auth/login")
    .set(TENANT_HEADER, TENANT_SUBDOMAIN)
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

export function authed(token: string) {
  return { Authorization: `Bearer ${token}`, [TENANT_HEADER]: TENANT_SUBDOMAIN };
}

let cachedAdminToken: string | null = null;
export async function adminToken(): Promise<string> {
  if (!cachedAdminToken) cachedAdminToken = await loginAs(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  return cachedAdminToken;
}

export async function getActiveTaskTypeId(token: string, code = "PICKUP"): Promise<string> {
  const res = await request.get("/api/task-types").set(authed(token));
  if (res.status !== 200) throw new Error(`Failed to list task types: ${res.status}`);
  const match = res.body.find((t: { code: string }) => t.code === code);
  if (!match) throw new Error(`Task type ${code} not found in seed data`);
  return match.id;
}

// Unique suffix per test-file run so fixtures (plate numbers, etc.) never
// collide with a previous run against the same shared dev database.
export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export async function createTask(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; version: number; status: string; [key: string]: unknown }> {
  const taskTypeId = (overrides.taskTypeId as string) ?? (await getActiveTaskTypeId(token));
  const res = await request
    .post("/api/tasks")
    .set(authed(token))
    .send({ taskTypeId, priority: "NORMAL", instructions: "Test task", ...overrides });
  if (res.status !== 201) {
    throw new Error(`Failed to create task: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function transitionTo(token: string, taskId: string, version: number, status: string) {
  return request
    .patch(`/api/tasks/${taskId}/status`)
    .set(authed(token))
    .send({ status, expectedVersion: version });
}

export async function createDriver(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; version?: number; [key: string]: unknown }> {
  const res = await request
    .post("/api/drivers")
    .set(authed(token))
    .send({ name: `Test Driver ${uniqueSuffix()}`, ...overrides });
  if (res.status !== 201) {
    throw new Error(`Failed to create driver: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function createTrip(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; version: number; status: string; [key: string]: unknown }> {
  const res = await request
    .post("/api/trips")
    .set(authed(token))
    .send({ tripType: "DIRECT_DELIVERY", ...overrides });
  if (res.status !== 201) {
    throw new Error(`Failed to create trip: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// Seed data always carries at least one vehicle for the tenant; reuse it
// rather than creating a new one per test since Vehicle has no dedicated
// test-creation endpoint helper here.
export async function getVehicleId(token: string): Promise<string> {
  const res = await request.get("/api/vehicles").set(authed(token));
  if (res.status !== 200) throw new Error(`Failed to list vehicles: ${res.status}`);
  const vehicles = Array.isArray(res.body) ? res.body : res.body.vehicles;
  if (!vehicles?.length) throw new Error("No vehicles found in seed data");
  return vehicles[0].id;
}
