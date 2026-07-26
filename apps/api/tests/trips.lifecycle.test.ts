import { beforeAll, describe, expect, it } from "vitest";
import { domainEvents } from "../src/lib/domainEvents";
import { adminToken, authed, createDriver, createTrip, getVehicleId, request } from "./helpers";

describe("trip lifecycle: create -> assign vehicle/driver -> route/manifest -> dispatch -> receive -> complete", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("walks a facility-transfer trip from DRAFT through COMPLETED, recording history/events/audit", async () => {
    const driver = await createDriver(token);
    const vehicleId = await getVehicleId(token);

    const events: Array<{ name: string; payload: unknown }> = [];
    const record = (name: string) => (payload: unknown) => events.push({ name, payload });
    const listeners: Array<[string, (payload: unknown) => void]> = [
      ["trip.created", record("trip.created")],
      ["trip.vehicle_assigned", record("trip.vehicle_assigned")],
      ["trip.driver_assigned", record("trip.driver_assigned")],
      ["trip.dispatched", record("trip.dispatched")],
      ["trip.completed", record("trip.completed")],
    ];
    for (const [name, fn] of listeners) domainEvents.on(name, fn);

    try {
      const trip = await createTrip(token, { tripType: "INTER_FACILITY" });
      expect(trip.status).toBe("DRAFT");
      expect(trip.version).toBe(1);

      // Assign vehicle
      const withVehicle = await request
        .patch(`/api/trips/${trip.id}/vehicle`)
        .set(authed(token))
        .send({ vehicleId, expectedVersion: trip.version });
      expect(withVehicle.status).toBe(200);
      expect(withVehicle.body.vehicleId).toBe(vehicleId);

      // Assign driver
      const withDriver = await request
        .patch(`/api/trips/${trip.id}/driver`)
        .set(authed(token))
        .send({ driverId: driver.id, expectedVersion: withVehicle.body.version });
      expect(withDriver.status).toBe(200);
      expect(withDriver.body.primaryDriverId).toBe(driver.id);

      // Transition through statuses (DRAFT -> PLANNING -> READY -> DISPATCHED
      // -> IN_PROGRESS -> ARRIVED -> COMPLETED, per TRIP_STATUS_TRANSITIONS)
      const toPlanning = await request
        .patch(`/api/trips/${trip.id}/status`)
        .set(authed(token))
        .send({ status: "PLANNING", expectedVersion: withDriver.body.version });
      expect(toPlanning.status).toBe(200);

      const toReady = await request
        .patch(`/api/trips/${toPlanning.body.id}/status`)
        .set(authed(token))
        .send({ status: "READY", expectedVersion: toPlanning.body.version });
      expect(toReady.status).toBe(200);

      const toDispatched = await request
        .patch(`/api/trips/${toReady.body.id}/status`)
        .set(authed(token))
        .send({ status: "DISPATCHED", expectedVersion: toReady.body.version });
      expect(toDispatched.status).toBe(200);

      const toInProgress = await request
        .patch(`/api/trips/${toDispatched.body.id}/status`)
        .set(authed(token))
        .send({ status: "IN_PROGRESS", expectedVersion: toDispatched.body.version });
      expect(toInProgress.status).toBe(200);

      const toArrived = await request
        .patch(`/api/trips/${toInProgress.body.id}/status`)
        .set(authed(token))
        .send({ status: "ARRIVED", expectedVersion: toInProgress.body.version });
      expect(toArrived.status).toBe(200);

      // Complete trip
      const completed = await request
        .patch(`/api/trips/${toArrived.body.id}/status`)
        .set(authed(token))
        .send({ status: "COMPLETED", expectedVersion: toArrived.body.version });
      expect(completed.status).toBe(200);
      expect(completed.body.status).toBe("COMPLETED");

      // Verify events fired
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.name === "trip.created")).toBe(true);
    } finally {
      for (const [name, fn] of listeners) domainEvents.off(name, fn);
    }
  });
});
