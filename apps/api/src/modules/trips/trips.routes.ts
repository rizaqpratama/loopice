import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./trips.controller";

const ALLOWED_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;

export const tripsRoutes = Router();
tripsRoutes.use(requireRole([...ALLOWED_ROLES]));

tripsRoutes.get("/", asyncHandler(controller.list));
tripsRoutes.post("/", asyncHandler(controller.create));
tripsRoutes.get("/:id", asyncHandler(controller.get));
tripsRoutes.patch("/:id", asyncHandler(controller.update));
tripsRoutes.patch("/:id/status", asyncHandler(controller.updateStatus));
tripsRoutes.patch("/:id/tasks/:taskId", asyncHandler(controller.addTask));
tripsRoutes.delete("/:id/tasks/:taskId", asyncHandler(controller.removeTask));
