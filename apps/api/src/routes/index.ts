import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { tenantResolver } from "../middleware/tenantResolver";
import { authRoutes } from "../modules/auth/auth.routes";
import { customersRoutes } from "../modules/customers/customers.routes";
import { ordersRoutes } from "../modules/orders/orders.routes";
import { superadminTenantsRoutes } from "../modules/tenants/superadminTenants.routes";
import { tenantsRoutes } from "../modules/tenants/tenants.routes";
import { usersRoutes } from "../modules/users/users.routes";

export const router = Router();

router.use("/auth", authRoutes);

// Platform-level: no subdomain/tenant resolution, SUPERADMIN only.
router.use(
  "/superadmin/tenants",
  authenticate,
  requireRole(["SUPERADMIN"]),
  superadminTenantsRoutes
);

// Tenant-scoped from here down.
router.use("/tenants", tenantResolver, tenantsRoutes);
router.use("/users", tenantResolver, authenticate, usersRoutes);
router.use("/customers", tenantResolver, authenticate, customersRoutes);
router.use("/orders", tenantResolver, authenticate, ordersRoutes);
