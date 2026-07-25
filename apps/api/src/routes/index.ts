import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { tenantResolver } from "../middleware/tenantResolver";
import { authRoutes } from "../modules/auth/auth.routes";
import { customersRoutes } from "../modules/customers/customers.routes";
import { driversRoutes } from "../modules/drivers/drivers.routes";
import { partnersRoutes } from "../modules/partners/partners.routes";
import { routePlansFlatRoutes, routeStopsFlatRoutes } from "../modules/routePlans/routePlans.routes";
import { serviceOrdersRoutes } from "../modules/serviceOrders/serviceOrders.routes";
import { shipmentLegsFlatRoutes } from "../modules/shipmentLegs/shipmentLegs.routes";
import { shipmentsFlatRoutes } from "../modules/shipments/shipments.routes";
import { stationsRoutes } from "../modules/stations/stations.routes";
import { taskExceptionsRoutes } from "../modules/taskExceptions/taskExceptions.routes";
import { tasksFlatRoutes } from "../modules/tasks/tasks.routes";
import { taskTypesRoutes } from "../modules/taskTypes/taskTypes.routes";
import { teamsRoutes } from "../modules/teams/teams.routes";
import { superadminTenantsRoutes } from "../modules/tenants/superadminTenants.routes";
import { tenantsRoutes } from "../modules/tenants/tenants.routes";
import { tripsRoutes } from "../modules/trips/trips.routes";
import { usersRoutes } from "../modules/users/users.routes";
import { vehiclesRoutes } from "../modules/vehicles/vehicles.routes";

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
router.use("/service-orders", tenantResolver, authenticate, serviceOrdersRoutes);
router.use("/shipments", tenantResolver, authenticate, shipmentsFlatRoutes);
router.use("/stations", tenantResolver, authenticate, stationsRoutes);
router.use("/shipment-legs", tenantResolver, authenticate, shipmentLegsFlatRoutes);
router.use("/tasks", tenantResolver, authenticate, tasksFlatRoutes);
router.use("/task-exceptions", tenantResolver, authenticate, taskExceptionsRoutes);
router.use("/task-types", tenantResolver, authenticate, taskTypesRoutes);
router.use("/drivers", tenantResolver, authenticate, driversRoutes);
router.use("/vehicles", tenantResolver, authenticate, vehiclesRoutes);
router.use("/teams", tenantResolver, authenticate, teamsRoutes);
router.use("/partners", tenantResolver, authenticate, partnersRoutes);
router.use("/trips", tenantResolver, authenticate, tripsRoutes);
router.use("/route-plans", tenantResolver, authenticate, routePlansFlatRoutes);
router.use("/route-stops", tenantResolver, authenticate, routeStopsFlatRoutes);
