import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./taskExceptions.controller";

const ALLOWED_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"] as const;

export const taskExceptionsRoutes = Router();
taskExceptionsRoutes.use(requireRole([...ALLOWED_ROLES]));
taskExceptionsRoutes.get("/:id", asyncHandler(controller.get));
taskExceptionsRoutes.patch("/:id", asyncHandler(controller.update));
