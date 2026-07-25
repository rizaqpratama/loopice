import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./shipmentLegs.controller";

const ALLOWED_ROLES = ["TENANT_ADMIN", "DISPATCHER"] as const;

// Nested under /service-orders/:serviceOrderId/legs -- create only, since
// legs are always returned embedded on the service order detail.
export const shipmentLegsNestedRoutes = Router({ mergeParams: true });
shipmentLegsNestedRoutes.use(requireRole([...ALLOWED_ROLES]));
shipmentLegsNestedRoutes.post("/", asyncHandler(controller.create));

// Flat, mounted at /shipment-legs -- status transition + delete by id.
export const shipmentLegsFlatRoutes = Router();
shipmentLegsFlatRoutes.use(requireRole([...ALLOWED_ROLES]));
shipmentLegsFlatRoutes.patch("/:id/status", asyncHandler(controller.updateStatus));
shipmentLegsFlatRoutes.delete("/:id", asyncHandler(controller.remove));
