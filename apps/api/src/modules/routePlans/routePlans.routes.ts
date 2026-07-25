import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./routePlans.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER", "WAREHOUSE_STAFF", "READ_ONLY"] as const;

// Mounted at /route-plans.
export const routePlansFlatRoutes = Router();
routePlansFlatRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
routePlansFlatRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
routePlansFlatRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
routePlansFlatRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
routePlansFlatRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
routePlansFlatRoutes.post("/:id/stops", requireRole([...WRITE_ROLES]), asyncHandler(controller.createStop));
routePlansFlatRoutes.patch(
  "/:id/sequence",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.reorderSequence)
);

// Mounted at /route-stops.
export const routeStopsFlatRoutes = Router();
routeStopsFlatRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deleteStop));
