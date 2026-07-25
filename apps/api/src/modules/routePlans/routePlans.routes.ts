import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./routePlans.controller";

const ALLOWED_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;

// Mounted at /route-plans.
export const routePlansFlatRoutes = Router();
routePlansFlatRoutes.use(requireRole([...ALLOWED_ROLES]));
routePlansFlatRoutes.get("/", asyncHandler(controller.list));
routePlansFlatRoutes.post("/", asyncHandler(controller.create));
routePlansFlatRoutes.get("/:id", asyncHandler(controller.get));
routePlansFlatRoutes.patch("/:id", asyncHandler(controller.update));
routePlansFlatRoutes.delete("/:id", asyncHandler(controller.deactivate));
routePlansFlatRoutes.post("/:id/stops", asyncHandler(controller.createStop));
routePlansFlatRoutes.patch("/:id/sequence", asyncHandler(controller.reorderSequence));

// Mounted at /route-stops.
export const routeStopsFlatRoutes = Router();
routeStopsFlatRoutes.use(requireRole([...ALLOWED_ROLES]));
routeStopsFlatRoutes.delete("/:id", asyncHandler(controller.deleteStop));
