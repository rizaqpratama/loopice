import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./vehicles.controller";

const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "READ_ONLY",
] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const vehiclesRoutes = Router();

vehiclesRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
vehiclesRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
vehiclesRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
vehiclesRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
vehiclesRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
