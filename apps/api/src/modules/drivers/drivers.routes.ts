import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./drivers.controller";

const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER", "WAREHOUSE_STAFF"] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const driversRoutes = Router();

driversRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
driversRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
driversRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
driversRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
driversRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
