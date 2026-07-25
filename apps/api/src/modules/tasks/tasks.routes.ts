import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./tasks.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
  "DRIVER",
] as const;

// Nested under /service-orders/:serviceOrderId/tasks -- create only.
export const tasksNestedRoutes = Router({ mergeParams: true });
tasksNestedRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));

// Flat, mounted at /tasks.
export const tasksFlatRoutes = Router();
tasksFlatRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
tasksFlatRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
tasksFlatRoutes.post("/bulk-assign", requireRole([...WRITE_ROLES]), asyncHandler(controller.bulkAssign));
tasksFlatRoutes.post("/bulk-status", requireRole([...WRITE_ROLES]), asyncHandler(controller.bulkStatus));
tasksFlatRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
tasksFlatRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
tasksFlatRoutes.patch("/:id/status", requireRole([...WRITE_ROLES, "DRIVER"]), asyncHandler(controller.updateStatus));
tasksFlatRoutes.patch("/:id/cancel", requireRole([...WRITE_ROLES]), asyncHandler(controller.cancel));
tasksFlatRoutes.patch("/:id/assign", requireRole([...WRITE_ROLES]), asyncHandler(controller.assign));
tasksFlatRoutes.patch("/:id/unassign", requireRole([...WRITE_ROLES]), asyncHandler(controller.unassign));
tasksFlatRoutes.patch("/:id/complete", requireRole([...WRITE_ROLES, "DRIVER"]), asyncHandler(controller.complete));
tasksFlatRoutes.patch(
  "/:id/partial-complete",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.partialComplete)
);
tasksFlatRoutes.patch("/:id/fail", requireRole([...WRITE_ROLES, "DRIVER"]), asyncHandler(controller.fail));
tasksFlatRoutes.post("/:id/proof", requireRole([...WRITE_ROLES, "DRIVER"]), asyncHandler(controller.addProof));
tasksFlatRoutes.post(
  "/:id/exceptions",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.reportException)
);
tasksFlatRoutes.post(
  "/:id/dependencies",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.addDependency)
);
tasksFlatRoutes.get(
  "/:id/dependencies",
  requireRole([...READ_ROLES]),
  asyncHandler(controller.listDependencies)
);
tasksFlatRoutes.delete(
  "/:id/dependencies/:dependencyId",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.removeDependency)
);
tasksFlatRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.remove));
