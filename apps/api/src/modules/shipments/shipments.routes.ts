import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./shipments.controller";

const ALLOWED_ROLES = ["TENANT_ADMIN", "DISPATCHER"] as const;

// Nested under /service-orders/:serviceOrderId/shipments -- create only,
// since shipments are always returned embedded on the service order detail.
// Role check is redundant with the parent service-orders router but kept
// here so this router is safe to mount on its own too.
export const shipmentsNestedRoutes = Router({ mergeParams: true });
shipmentsNestedRoutes.use(requireRole([...ALLOWED_ROLES]));
shipmentsNestedRoutes.post("/", asyncHandler(controller.create));

// Flat, mounted at /shipments -- update/delete by shipment id directly.
export const shipmentsFlatRoutes = Router();
shipmentsFlatRoutes.use(requireRole([...ALLOWED_ROLES]));
shipmentsFlatRoutes.patch("/:id", asyncHandler(controller.update));
shipmentsFlatRoutes.delete("/:id", asyncHandler(controller.remove));
