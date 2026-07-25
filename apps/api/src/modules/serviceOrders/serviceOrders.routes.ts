import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import { shipmentLegsNestedRoutes } from "../shipmentLegs/shipmentLegs.routes";
import { shipmentsNestedRoutes } from "../shipments/shipments.routes";
import { tasksNestedRoutes } from "../tasks/tasks.routes";
import * as controller from "./serviceOrders.controller";

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

export const serviceOrdersRoutes = Router();

serviceOrdersRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
serviceOrdersRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
serviceOrdersRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
serviceOrdersRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
serviceOrdersRoutes.patch("/:id/status", requireRole([...WRITE_ROLES]), asyncHandler(controller.updateStatus));

serviceOrdersRoutes.use("/:serviceOrderId/shipments", shipmentsNestedRoutes);
serviceOrdersRoutes.use("/:serviceOrderId/legs", shipmentLegsNestedRoutes);
serviceOrdersRoutes.use("/:serviceOrderId/tasks", tasksNestedRoutes);
