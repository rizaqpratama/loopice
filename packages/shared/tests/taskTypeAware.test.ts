import { describe, expect, it } from "vitest";
import { canTransitionTaskStatusForType } from "../src/taskTypeAware";

describe("canTransitionTaskStatusForType", () => {
  it("allows any statically-valid transition when allowedStatuses is empty", () => {
    expect(canTransitionTaskStatusForType({ allowedStatuses: [] }, "DRAFT", "UNASSIGNED")).toBe(true);
    expect(canTransitionTaskStatusForType({ allowedStatuses: [] }, "IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("rejects a transition that isn't valid in the base status graph regardless of allow-list", () => {
    // DRAFT -> COMPLETED isn't a real edge, even with an allow-list permitting COMPLETED.
    expect(canTransitionTaskStatusForType({ allowedStatuses: ["COMPLETED"] }, "DRAFT", "COMPLETED")).toBe(
      false
    );
  });

  it("rejects a statically-valid transition whose target isn't in the type's allow-list", () => {
    // IN_PROGRESS -> FAILED is a valid base edge, but this type only permits COMPLETED.
    expect(canTransitionTaskStatusForType({ allowedStatuses: ["COMPLETED"] }, "IN_PROGRESS", "FAILED")).toBe(
      false
    );
  });

  it("allows a statically-valid transition whose target is in the type's allow-list", () => {
    expect(
      canTransitionTaskStatusForType({ allowedStatuses: ["COMPLETED", "FAILED"] }, "IN_PROGRESS", "COMPLETED")
    ).toBe(true);
  });

  it("rejects transitions out of terminal statuses even with a permissive allow-list", () => {
    expect(canTransitionTaskStatusForType({ allowedStatuses: [] }, "COMPLETED", "DRAFT")).toBe(false);
    expect(canTransitionTaskStatusForType({ allowedStatuses: [] }, "CANCELLED", "UNASSIGNED")).toBe(false);
  });
});
