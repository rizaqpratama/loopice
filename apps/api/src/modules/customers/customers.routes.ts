import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { requireRole } from "../../middleware/requireRole";
import * as controller from "./customers.controller";

export const customersRoutes = Router();

customersRoutes.use(requireRole(["TENANT_ADMIN", "DISPATCHER"]));

customersRoutes.get("/", asyncHandler(controller.list));
customersRoutes.post("/", asyncHandler(controller.create));
customersRoutes.get("/:id", asyncHandler(controller.get));
customersRoutes.patch("/:id", asyncHandler(controller.update));
customersRoutes.delete("/:id", asyncHandler(controller.remove));
