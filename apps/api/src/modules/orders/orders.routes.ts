import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./orders.controller";

export const ordersRoutes = Router();

ordersRoutes.use(requireRole(["TENANT_ADMIN", "DISPATCHER"]));

ordersRoutes.get("/", asyncHandler(controller.list));
ordersRoutes.post("/", asyncHandler(controller.create));
ordersRoutes.get("/:id", asyncHandler(controller.get));
ordersRoutes.patch("/:id", asyncHandler(controller.update));
ordersRoutes.patch("/:id/status", asyncHandler(controller.updateStatus));
