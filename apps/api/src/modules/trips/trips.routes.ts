import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./trips.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER", "WAREHOUSE_STAFF", "READ_ONLY"] as const;

export const tripsRoutes = Router();

tripsRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
tripsRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
tripsRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
tripsRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
tripsRoutes.patch("/:id/status", requireRole([...WRITE_ROLES]), asyncHandler(controller.updateStatus));
tripsRoutes.patch("/:id/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.addTask));
tripsRoutes.delete("/:id/tasks/:taskId", requireRole([...WRITE_ROLES]), asyncHandler(controller.removeTask));
