import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./facilityHandovers.controller";

const WRITE_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "FACILITY_SUPERVISOR",
] as const;
const READ_ROLES = [...WRITE_ROLES, "CUSTOMER_SERVICE", "FINANCE", "READ_ONLY", "DRIVER"] as const;
const ACCEPT_ROLES = [...WRITE_ROLES, "DRIVER"] as const;

export const facilityHandoversFlatRoutes = Router();

// List and create
facilityHandoversFlatRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
facilityHandoversFlatRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));

// Get handover
facilityHandoversFlatRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));

// Accept and reject
facilityHandoversFlatRoutes.patch(
  "/:id/accept",
  requireRole([...ACCEPT_ROLES]),
  asyncHandler(controller.accept)
);
facilityHandoversFlatRoutes.patch(
  "/:id/reject",
  requireRole([...WRITE_ROLES, "FACILITY_SUPERVISOR"]),
  asyncHandler(controller.reject)
);
