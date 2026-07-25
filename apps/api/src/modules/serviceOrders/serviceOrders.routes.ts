import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import { shipmentLegsNestedRoutes } from "../shipmentLegs/shipmentLegs.routes";
import { shipmentsNestedRoutes } from "../shipments/shipments.routes";
import * as controller from "./serviceOrders.controller";

export const serviceOrdersRoutes = Router();

serviceOrdersRoutes.use(requireRole(["TENANT_ADMIN", "DISPATCHER"]));

serviceOrdersRoutes.get("/", asyncHandler(controller.list));
serviceOrdersRoutes.post("/", asyncHandler(controller.create));
serviceOrdersRoutes.get("/:id", asyncHandler(controller.get));
serviceOrdersRoutes.patch("/:id", asyncHandler(controller.update));
serviceOrdersRoutes.patch("/:id/status", asyncHandler(controller.updateStatus));

serviceOrdersRoutes.use("/:serviceOrderId/shipments", shipmentsNestedRoutes);
serviceOrdersRoutes.use("/:serviceOrderId/legs", shipmentLegsNestedRoutes);
