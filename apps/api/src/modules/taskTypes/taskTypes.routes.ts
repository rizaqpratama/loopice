import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./taskTypes.controller";

const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const taskTypesRoutes = Router();

taskTypesRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
taskTypesRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
taskTypesRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
taskTypesRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
taskTypesRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
