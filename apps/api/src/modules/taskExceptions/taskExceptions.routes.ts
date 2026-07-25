import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./taskExceptions.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "READ_ONLY",
] as const;

export const taskExceptionsRoutes = Router();
taskExceptionsRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
taskExceptionsRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
