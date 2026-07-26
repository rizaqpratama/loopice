import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./trips.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = [
  ...WRITE_ROLES,
  "WAREHOUSE_STAFF",
  "FACILITY_SUPERVISOR",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
] as const;

export const tripsRoutes = Router();

// List and create
tripsRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
tripsRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));

// Get, update, status
tripsRoutes.get("/:id", requireRole([...READ_ROLES, "DRIVER"]), asyncHandler(controller.get));
tripsRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
tripsRoutes.patch(
  "/:id/status",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.updateStatus)
);

// Vehicle assignment
tripsRoutes.patch("/:id/vehicle", requireRole([...WRITE_ROLES]), asyncHandler(controller.assignVehicle));
tripsRoutes.delete("/:id/vehicle", requireRole([...WRITE_ROLES]), asyncHandler(controller.unassignVehicle));

// Driver assignment
tripsRoutes.patch("/:id/driver", requireRole([...WRITE_ROLES]), asyncHandler(controller.assignDriver));
tripsRoutes.delete("/:id/driver", requireRole([...WRITE_ROLES]), asyncHandler(controller.unassignDriver));

// Secondary drivers
tripsRoutes.post(
  "/:id/secondary-drivers",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.addSecondaryDriver)
);
tripsRoutes.delete(
  "/:id/secondary-drivers/:driverId",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.removeSecondaryDriver)
);

// Tasks
tripsRoutes.post("/:id/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.addTask));
tripsRoutes.delete("/:id/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.removeTask));

// Dispatch check
tripsRoutes.get(
  "/:id/dispatch-check",
  requireRole([...READ_ROLES, "DRIVER"]),
  asyncHandler(controller.getDispatchChecklist)
);

// Pause and resume
tripsRoutes.patch(
  "/:id/pause",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.pause)
);
tripsRoutes.patch(
  "/:id/resume",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.resume)
);

// Exceptions
tripsRoutes.post(
  "/:id/exceptions",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.reportException)
);

// Replacement trip (Ops Manager+ only)
tripsRoutes.post(
  "/:id/replacement",
  requireRole(["TENANT_ADMIN", "OPERATIONS_MANAGER"]),
  asyncHandler(controller.createReplacement)
);
