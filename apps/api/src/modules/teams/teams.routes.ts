import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./teams.controller";

const READ_ROLES = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER", "WAREHOUSE_STAFF"] as const;
const WRITE_ROLES = ["TENANT_ADMIN"] as const;

export const teamsRoutes = Router();

teamsRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
teamsRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));
teamsRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));
teamsRoutes.patch("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.update));
teamsRoutes.delete("/:id", requireRole([...WRITE_ROLES]), asyncHandler(controller.deactivate));
teamsRoutes.post("/:teamId/members", requireRole([...WRITE_ROLES]), asyncHandler(controller.addMember));
teamsRoutes.delete(
  "/:teamId/members/:userId",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.removeMember)
);
