import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./manifests.controller";

const WRITE_ROLES = [
  "TENANT_ADMIN",
  "OPERATIONS_MANAGER",
  "DISPATCHER",
  "WAREHOUSE_STAFF",
  "FACILITY_SUPERVISOR",
] as const;
const READ_ROLES = [...WRITE_ROLES, "CUSTOMER_SERVICE", "FINANCE", "READ_ONLY"] as const;

export const manifestsFlatRoutes = Router();

// List and create
manifestsFlatRoutes.get("/", requireRole([...READ_ROLES]), asyncHandler(controller.list));
manifestsFlatRoutes.post("/", requireRole([...WRITE_ROLES]), asyncHandler(controller.create));

// Get manifest
manifestsFlatRoutes.get("/:id", requireRole([...READ_ROLES]), asyncHandler(controller.get));

// Manifest items
manifestsFlatRoutes.post("/:id/items", requireRole([...WRITE_ROLES]), asyncHandler(controller.addItem));
manifestsFlatRoutes.patch(
  "/:id/items/:itemId/loading",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.updateItemLoading)
);
manifestsFlatRoutes.patch(
  "/:id/items/:itemId/receiving",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.updateItemReceiving)
);
manifestsFlatRoutes.delete(
  "/:id/items/:itemId",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.deleteItem)
);

// Seal and dispatch
manifestsFlatRoutes.patch(
  "/:id/seal",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.seal)
);

// Dispatch checklist and dispatch
manifestsFlatRoutes.get(
  "/:tripId/dispatch-check",
  requireRole([...READ_ROLES]),
  asyncHandler(controller.getDispatchChecklist)
);
manifestsFlatRoutes.patch(
  "/:tripId/dispatch",
  requireRole([...WRITE_ROLES]),
  asyncHandler(controller.dispatch)
);
