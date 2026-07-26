import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./receivingReconciliation.controller";

const WRITE_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "FACILITY_SUPERVISOR",
] as const;
const READ_ROLES = [
  ...WRITE_ROLES,
  "CUSTOMER_SERVICE",
  "FINANCE",
  "READ_ONLY",
] as const;

export const receivingReconciliationRoutes = Router();

// List and create
receivingReconciliationRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
receivingReconciliationRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.start));

// Get
receivingReconciliationRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));

// Record counts (warehouse staff)
receivingReconciliationRoutes.patch(
  "/:id/counts",
  requireRole([...WRITE_ROLES, "WAREHOUSE_STAFF"]),
  asyncHandler(controller.recordCounts)
);

// Complete reconciliation
receivingReconciliationRoutes.patch(
  "/:id/complete",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.complete)
);

// Spawn discrepancy task
receivingReconciliationRoutes.post(
  "/:id/discrepancies/:itemId/spawn-task",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.spawnDiscrepancyTask)
);
