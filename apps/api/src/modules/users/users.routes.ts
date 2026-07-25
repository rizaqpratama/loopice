import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./users.controller";

export const usersRoutes = Router();

usersRoutes.use(requireRole(["TENANT_ADMIN"]));

usersRoutes.get("/", asyncHandler(controller.list));
usersRoutes.post("/", asyncHandler(controller.create));
usersRoutes.get("/:id", asyncHandler(controller.get));
usersRoutes.patch("/:id", asyncHandler(controller.update));
usersRoutes.delete("/:id", asyncHandler(controller.deactivate));
