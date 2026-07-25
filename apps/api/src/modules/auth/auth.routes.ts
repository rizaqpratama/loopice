import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { authenticate } from "../../middleware/authenticate";
import { tenantResolver } from "../../middleware/tenantResolver";
import * as controller from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", tenantResolver, asyncHandler(controller.register));
authRoutes.post("/login", tenantResolver, asyncHandler(controller.login));
authRoutes.post("/superadmin/login", asyncHandler(controller.superadminLogin));
authRoutes.get("/me", authenticate, asyncHandler(controller.me));
