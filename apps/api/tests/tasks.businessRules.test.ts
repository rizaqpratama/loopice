import { beforeAll, describe, expect, it } from "vitest";
import {
  adminToken,
  authed,
  createDriver,
  createTask,
  getActiveTaskTypeId,
  request,
  transitionTo,
} from "./helpers";

describe("task business rules", () => {
  let token: string;
  let taskTypeId: string;

  beforeAll(async () => {
    token = await adminToken();
    // OTHER has no required proof/fields, keeping these rule tests focused
    // on the rule under test rather than validation friction.
    taskTypeId = await getActiveTaskTypeId(token, "OTHER");
  });

  it("keeps CANCELLED immutable -- no further transition is accepted", async () => {
    const task = await createTask(token, { taskTypeId });
    const cancelled = await request
      .patch(`/api/tasks/${task.id}/cancel`)
      .set(authed(token))
      .send({ reason: "No longer needed", expectedVersion: task.version });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");

    const reopen = await transitionTo(token, task.id, cancelled.body.version, "UNASSIGNED");
    expect(reopen.status).toBe(400);
  });

  it("requires a non-empty reason to cancel a task", async () => {
    const task = await createTask(token, { taskTypeId });
    const res = await request
      .patch(`/api/tasks/${task.id}/cancel`)
      .set(authed(token))
      .send({ reason: "", expectedVersion: task.version });
    expect(res.status).toBe(400);
  });

  it("rejects a stale expectedVersion with 409, not silently overwriting", async () => {
    const task = await createTask(token, { taskTypeId });
    const first = await transitionTo(token, task.id, task.version, "UNASSIGNED");
    expect(first.status).toBe(200);

    // Reusing the original (now-stale) version should conflict, not succeed.
    const stale = await transitionTo(token, task.id, task.version, "UNASSIGNED");
    expect(stale.status).toBe(409);
  });

  it("opens a TaskException when a task is failed", async () => {
    // FAILED is only reachable from EN_ROUTE or ARRIVED -- walk the task there first.
    const task = await createTask(token, { taskTypeId });
    await transitionTo(token, task.id, task.version, "UNASSIGNED");
    const driver = await createDriver(token);
    await request
      .patch(`/api/tasks/${task.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: driver.id, expectedVersion: 2 });
    await transitionTo(token, task.id, 3, "PLANNED");
    await transitionTo(token, task.id, 4, "READY");
    await transitionTo(token, task.id, 5, "EN_ROUTE");

    const failed = await request
      .patch(`/api/tasks/${task.id}/fail`)
      .set(authed(token))
      .send({ exceptionType: "ADDRESS_NOT_FOUND", note: "Could not locate address", expectedVersion: 6 });
    expect(failed.status).toBe(200);
    expect(failed.body.status).toBe("FAILED");
    expect(failed.body.exceptions).toHaveLength(1);
    expect(failed.body.exceptions[0].type).toBe("ADDRESS_NOT_FOUND");
    expect(failed.body.exceptions[0].status).toBe("OPEN");
  });

  it("captures the previous schedule when rescheduling and moves the task to RESCHEDULED", async () => {
    // RESCHEDULED is only reachable from READY, EN_ROUTE, or FAILED -- walk
    // the task to READY first (DRAFT -> UNASSIGNED -> ASSIGNED -> PLANNED -> READY).
    const created = await createTask(token, {
      taskTypeId,
      scheduledDate: "2026-08-01T09:00:00.000Z",
    });
    await transitionTo(token, created.id, created.version, "UNASSIGNED");
    const driver = await createDriver(token);
    await request
      .patch(`/api/tasks/${created.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: driver.id, expectedVersion: 2 });
    await transitionTo(token, created.id, 3, "PLANNED");
    const ready = await transitionTo(token, created.id, 4, "READY");
    expect(ready.status).toBe(200);

    const rescheduled = await request
      .patch(`/api/tasks/${created.id}/reschedule`)
      .set(authed(token))
      .send({
        reason: "Customer requested a later date",
        scheduledDate: "2026-08-05T09:00:00.000Z",
        expectedVersion: ready.body.version,
      });
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.status).toBe("RESCHEDULED");
    expect(rescheduled.body.scheduledDate).toBe("2026-08-05T09:00:00.000Z");

    const lastHistory = rescheduled.body.statusHistory[rescheduled.body.statusHistory.length - 1];
    expect(lastHistory.status).toBe("RESCHEDULED");
    expect(lastHistory.previousScheduledDate).toBe("2026-08-01T09:00:00.000Z");
  });

  it("blocks a driver from being double-booked into an overlapping time window", async () => {
    const driver = await createDriver(token);
    const windowA = { timeWindowStart: "2026-09-01T08:00:00.000Z", timeWindowEnd: "2026-09-01T10:00:00.000Z" };
    const windowB = { timeWindowStart: "2026-09-01T09:00:00.000Z", timeWindowEnd: "2026-09-01T11:00:00.000Z" };

    const taskA = await createTask(token, { taskTypeId, ...windowA });
    const taskB = await createTask(token, { taskTypeId, ...windowB });
    await transitionTo(token, taskA.id, taskA.version, "UNASSIGNED");
    await transitionTo(token, taskB.id, taskB.version, "UNASSIGNED");

    const assignA = await request
      .patch(`/api/tasks/${taskA.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: driver.id, expectedVersion: 2 });
    expect(assignA.status).toBe(200);

    const assignB = await request
      .patch(`/api/tasks/${taskB.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: driver.id, expectedVersion: 2 });
    expect(assignB.status).toBe(409);

    // The same assignment succeeds with an explicit override.
    const overrideB = await request
      .patch(`/api/tasks/${taskB.id}/assign`)
      .set(authed(token))
      .send({
        assignedDriverId: driver.id,
        expectedVersion: 2,
        override: true,
        overrideReason: "Dispatcher accepted the overlap",
      });
    expect(overrideB.status).toBe(200);
    expect(overrideB.body.status).toBe("ASSIGNED");
  });

  it("blocks a FINISH_TO_START successor from progressing until its predecessor completes", async () => {
    const predecessor = await createTask(token, { taskTypeId });
    const successor = await createTask(token, { taskTypeId });

    const dep = await request
      .post(`/api/tasks/${successor.id}/dependencies`)
      .set(authed(token))
      .send({ relatedTaskId: predecessor.id, type: "FINISH_TO_START", direction: "predecessor" });
    expect(dep.status).toBe(201);

    await transitionTo(token, successor.id, successor.version, "UNASSIGNED");
    const driver = await createDriver(token);
    const assignSuccessor = await request
      .patch(`/api/tasks/${successor.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: driver.id, expectedVersion: 2 });
    expect(assignSuccessor.status).toBe(200);

    // ASSIGNED -> PLANNED -> READY is fine (not dependency-gated); EN_ROUTE is gated.
    const toPlanned = await transitionTo(token, successor.id, 3, "PLANNED");
    expect(toPlanned.status).toBe(200);
    const toReady = await transitionTo(token, successor.id, 4, "READY");
    expect(toReady.status).toBe(200);
    const blocked = await transitionTo(token, successor.id, 5, "EN_ROUTE");
    expect(blocked.status).toBe(400);

    // Completing the predecessor unblocks the successor.
    await transitionTo(token, predecessor.id, predecessor.version, "UNASSIGNED");
    const predDriver = await createDriver(token);
    await request
      .patch(`/api/tasks/${predecessor.id}/assign`)
      .set(authed(token))
      .send({ assignedDriverId: predDriver.id, expectedVersion: 2 });
    await transitionTo(token, predecessor.id, 3, "PLANNED");
    await transitionTo(token, predecessor.id, 4, "READY");
    await transitionTo(token, predecessor.id, 5, "EN_ROUTE");
    await transitionTo(token, predecessor.id, 6, "ARRIVED");
    await transitionTo(token, predecessor.id, 7, "IN_PROGRESS");
    const completePred = await request
      .patch(`/api/tasks/${predecessor.id}/complete`)
      .set(authed(token))
      .send({ expectedVersion: 8 });
    expect(completePred.status).toBe(200);

    const unblocked = await transitionTo(token, successor.id, 5, "EN_ROUTE");
    expect(unblocked.status).toBe(200);
  });

  it("rejects a dependency that would create a cycle", async () => {
    const a = await createTask(token, { taskTypeId });
    const b = await createTask(token, { taskTypeId });
    const c = await createTask(token, { taskTypeId });

    const ab = await request
      .post(`/api/tasks/${b.id}/dependencies`)
      .set(authed(token))
      .send({ relatedTaskId: a.id, type: "FINISH_TO_START", direction: "predecessor" });
    expect(ab.status).toBe(201);

    const bc = await request
      .post(`/api/tasks/${c.id}/dependencies`)
      .set(authed(token))
      .send({ relatedTaskId: b.id, type: "FINISH_TO_START", direction: "predecessor" });
    expect(bc.status).toBe(201);

    // C -> A would close the loop A -> B -> C -> A.
    const cycle = await request
      .post(`/api/tasks/${a.id}/dependencies`)
      .set(authed(token))
      .send({ relatedTaskId: c.id, type: "FINISH_TO_START", direction: "predecessor" });
    expect(cycle.status).toBe(400);
  });

  it("reports per-task success/failure on a bulk assign with one invalid id", async () => {
    const task = await createTask(token, { taskTypeId });
    await transitionTo(token, task.id, task.version, "UNASSIGNED");
    const driver = await createDriver(token);

    const res = await request
      .post("/api/tasks/bulk-assign")
      .set(authed(token))
      .send({ taskIds: [task.id, "not-a-real-task-id"], assignedDriverId: driver.id });
    expect(res.status).toBe(200);
    const byId = new Map(res.body.map((r: { taskId: string; success: boolean }) => [r.taskId, r.success]));
    expect(byId.get(task.id)).toBe(true);
    expect(byId.get("not-a-real-task-id")).toBe(false);
  });
});
