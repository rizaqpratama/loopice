import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./partners.controller";

const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER", "WAREHOUSE_STAFF"] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const partnersRoutes = Router();

partnersRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
partnersRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
partnersRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
partnersRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
partnersRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
