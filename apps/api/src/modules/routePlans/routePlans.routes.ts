import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./routePlans.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = [
  ...WRITE_ROLES,
  "WAREHOUSE_STAFF",
  "FACILITY_SUPERVISOR",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
] as const;

// Mounted at /route-plans.
export const routePlansFlatRoutes = Router();

// List and create
routePlansFlatRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
routePlansFlatRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));

// Get, update, delete
routePlansFlatRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
routePlansFlatRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
routePlansFlatRoutes.patch("/:id/status", requireRole([...WRITE_ROLES]), asyncHandler(controller.updateStatus));

// Versioning
routePlansFlatRoutes.post("/:id/versions", requireRole([...WRITE_ROLES]), asyncHandler(controller.createVersion));
routePlansFlatRoutes.patch("/:id/activate", requireRole([...WRITE_ROLES]), asyncHandler(controller.activateVersion));
routePlansFlatRoutes.get("/:id/versions", requireRole([...READ_ROLES]), asyncHandler(controller.getVersions));

// Stops (also flat mounted)
routePlansFlatRoutes.post("/:id/stops", requireRole([...WRITE_ROLES]), asyncHandler(controller.addStop));
routePlansFlatRoutes.patch("/:id/sequence", requireRole([...WRITE_ROLES]), asyncHandler(controller.reorderStops));

// Compare versions
routePlansFlatRoutes.get("/compare", requireRole([...READ_ROLES]), asyncHandler(controller.compareVersions));

// Mounted at /route-stops.
export const routeStopsFlatRoutes = Router();

// Get, update, delete stop
routeStopsFlatRoutes.get("/:stopId", requireRole([...READ_ROLES]), asyncHandler(controller.getStop));
routeStopsFlatRoutes.patch("/:stopId", requireRole([...WRITE_ROLES]), asyncHandler(controller.updateStop));
routeStopsFlatRoutes.patch(
  "/:stopId/status",
  requireRole([...WRITE_ROLES, "DRIVER"]),
  asyncHandler(controller.updateStopStatus)
);
routeStopsFlatRoutes.delete("/:stopId", requireRole([...WRITE_ROLES]), asyncHandler(controller.deleteStop));

// Link/unlink tasks
routeStopsFlatRoutes.post("/:stopId/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.linkTask));
routeStopsFlatRoutes.delete("/:stopId/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.unlinkTask));
