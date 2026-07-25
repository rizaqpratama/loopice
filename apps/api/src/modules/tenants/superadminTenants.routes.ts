import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import * as controller from "./superadminTenants.controller";

export const superadminTenantsRoutes = Router();

superadminTenantsRoutes.get("/", asyncHandler(controller.list));
superadminTenantsRoutes.post("/", asyncHandler(controller.create));
superadminTenantsRoutes.get("/:id", asyncHandler(controller.get));
superadminTenantsRoutes.patch("/:id", asyncHandler(controller.update));
superadminTenantsRoutes.delete("/:id", asyncHandler(controller.deactivate));
