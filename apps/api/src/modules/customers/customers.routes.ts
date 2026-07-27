import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./customers.controller";

const WRITE_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;
const READ_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
] as const;

export const customersRoutes = Router();

customersRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
customersRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
customersRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
customersRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
customersRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.remove));
