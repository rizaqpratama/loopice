import { beforeAll, describe, expect, it } from "vitest";
import { domainEvents } from "../src/lib/domainEvents";
import { adminToken, authed, createDriver, createTask, getActiveTaskTypeId, request } from "./helpers";

describe("task lifecycle: create -> assign -> transitions -> complete", () => {
  let token: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it("walks a PICKUP task from DRAFT through to COMPLETED, recording history/version/events", async () => {
    const taskTypeId = await getActiveTaskTypeId(token, "PICKUP");
    const driver = await createDriver(token);

    const events: Array<{ name: string; payload: unknown }> = [];
    const record = (name: string) => (payload: unknown) => events.push({ name, payload });
    const listeners: Array<[string, (payload: unknown) => void]> = [
      ["task.created", record("task.created")],
      ["task.assigned", record("task.assigned")],
      ["task.status_changed", record("task.status_changed")],
      ["task.completed", record("task.completed")],
    ];
    for (const [name, fn] of listeners) domainEvents.on(name, fn);

    try {
      const task = await createTask(token, { taskTypeId });
      expect(task.status).toBe("DRAFT");
      expect(task.version).toBe(1);

      // DRAFT -> UNASSIGNED
      const toUnassigned = await request
        .patch(`/api/tasks/${task.id}/status`)
        .set(authed(token))
        .send({ status: "UNASSIGNED", expectedVersion: task.version });
      expect(toUnassigned.status).toBe(200);
      expect(toUnassigned.body.version).toBe(2);

      // assign -> ASSIGNED
      const assigned = await request
        .patch(`/api/tasks/${task.id}/assign`)
        .set(authed(token))
        .send({ assignedDriverId: driver.id, expectedVersion: toUnassigned.body.version });
      expect(assigned.status).toBe(200);
      expect(assigned.body.status).toBe("ASSIGNED");
      expect(assigned.body.version).toBe(3);

      // ASSIGNED -> PLANNED -> READY -> EN_ROUTE -> ARRIVED -> IN_PROGRESS
      const path = ["PLANNED", "READY", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
      let current = assigned.body;
      for (const status of path) {
        const res = await request
          .patch(`/api/tasks/${current.id}/status`)
          .set(authed(token))
          .send({ status, expectedVersion: current.version });
        expect(res.status, `transition to ${status} should succeed`).toBe(200);
        expect(res.body.status).toBe(status);
        current = res.body;
      }

      // IN_PROGRESS -> COMPLETED, with the proof PICKUP requires
      const completed = await request
        .patch(`/api/tasks/${current.id}/complete`)
        .set(authed(token))
        .send({
          expectedVersion: current.version,
          proof: [{ type: "SIGNATURE", textValue: "Jane Doe" }],
        });
      expect(completed.status).toBe(200);
      expect(completed.body.status).toBe("COMPLETED");

      // Every status change has a history row: DRAFT (initial) + UNASSIGNED,
      // ASSIGNED, PLANNED, READY, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED.
      expect(completed.body.statusHistory.length).toBe(9);
      expect(completed.body.proofs).toHaveLength(1);
      expect(completed.body.proofs[0].type).toBe("SIGNATURE");

      // COMPLETED is terminal and immutable.
      const reopen = await request
        .patch(`/api/tasks/${completed.body.id}/status`)
        .set(authed(token))
        .send({ status: "IN_PROGRESS", expectedVersion: completed.body.version });
      expect(reopen.status).toBe(400);

      expect(events.some((e) => e.name === "task.created")).toBe(true);
      expect(events.some((e) => e.name === "task.assigned")).toBe(true);
      expect(events.some((e) => e.name === "task.status_changed")).toBe(true);
      expect(events.some((e) => e.name === "task.completed")).toBe(true);
    } finally {
      for (const [name, fn] of listeners) domainEvents.off(name, fn);
    }
  });
});
