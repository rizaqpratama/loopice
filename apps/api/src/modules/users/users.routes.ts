import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./users.controller";

// Account management (create/update/deactivate logins) stays TENANT_ADMIN-only
// -- unlike operational data, this is a sensitive administrative action.
const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "READ_ONLY"] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const usersRoutes = Router();

usersRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
usersRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
usersRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
usersRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
usersRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
