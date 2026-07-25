import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./stations.controller";

const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "READ_ONLY",
] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const stationsRoutes = Router();

stationsRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
stationsRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
stationsRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
stationsRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
stationsRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
