import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/RoleGate";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { ServiceOrdersListPage } from "@/pages/serviceOrders/ServiceOrdersListPage";
import { ServiceOrderCreatePage } from "@/pages/serviceOrders/ServiceOrderCreatePage";
import { ServiceOrderDetailPage } from "@/pages/serviceOrders/ServiceOrderDetailPage";
import { TaskPoolPage } from "@/pages/tasks/TaskPoolPage";
import { TaskCreatePage } from "@/pages/tasks/TaskCreatePage";
import { TaskDetailPage } from "@/pages/tasks/TaskDetailPage";
import { DispatchBoardPage } from "@/pages/dispatch/DispatchBoardPage";
import { TenantBrandingSettingsPage } from "@/pages/settings/TenantBrandingSettingsPage";
import { UserManagementPage } from "@/pages/settings/UserManagementPage";
import { StationsSettingsPage } from "@/pages/settings/StationsSettingsPage";
import { TaskTypesSettingsPage } from "@/pages/settings/TaskTypesSettingsPage";
import { DriversSettingsPage } from "@/pages/settings/DriversSettingsPage";
import { VehiclesSettingsPage } from "@/pages/settings/VehiclesSettingsPage";
import { TeamsSettingsPage } from "@/pages/settings/TeamsSettingsPage";
import { PartnersSettingsPage } from "@/pages/settings/PartnersSettingsPage";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<Shell><DashboardPage /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersListPage /></Shell>} />
      <Route path="/customers/:id" element={<Shell><CustomerDetailPage /></Shell>} />
      <Route path="/service-orders" element={<Shell><ServiceOrdersListPage /></Shell>} />
      <Route path="/service-orders/new" element={<Shell><ServiceOrderCreatePage /></Shell>} />
      <Route path="/service-orders/:id" element={<Shell><ServiceOrderDetailPage /></Shell>} />
      <Route path="/tasks" element={<Shell><TaskPoolPage /></Shell>} />
      <Route path="/tasks/new" element={<Shell><TaskCreatePage /></Shell>} />
      <Route path="/tasks/:id" element={<Shell><TaskDetailPage /></Shell>} />
      <Route
        path="/dispatch"
        element={
          <Shell>
            <RoleGate
              allow={["TENANT_ADMIN", "OPERATIONS_MANAGER", "DISPATCHER"]}
              fallback={<Navigate to="/" replace />}
            >
              <DispatchBoardPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/branding"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <TenantBrandingSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/users"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <UserManagementPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/stations"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <StationsSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/task-types"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <TaskTypesSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/drivers"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <DriversSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/vehicles"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <VehiclesSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/teams"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <TeamsSettingsPage />
            </RoleGate>
          </Shell>
        }
      />
      <Route
        path="/settings/partners"
        element={
          <Shell>
            <RoleGate allow={["TENANT_ADMIN"]} fallback={<Navigate to="/" replace />}>
              <PartnersSettingsPage />
            </RoleGate>
          </Shell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
