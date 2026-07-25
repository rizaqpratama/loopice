import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./tenants.controller";

export const tenantsRoutes = Router();

tenantsRoutes.get("/branding", asyncHandler(controller.branding));
tenantsRoutes.get(
  "/me",
  authenticate,
  requireRole(["TENANT_ADMIN"]),
  asyncHandler(controller.me)
);
tenantsRoutes.patch(
  "/me",
  authenticate,
  requireRole(["TENANT_ADMIN"]),
  asyncHandler(controller.updateMe)
);
