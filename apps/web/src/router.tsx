import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/RoleGate";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { OrdersListPage } from "@/pages/orders/OrdersListPage";
import { OrderCreatePage } from "@/pages/orders/OrderCreatePage";
import { OrderDetailPage } from "@/pages/orders/OrderDetailPage";
import { TenantBrandingSettingsPage } from "@/pages/settings/TenantBrandingSettingsPage";
import { UserManagementPage } from "@/pages/settings/UserManagementPage";

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
      <Route path="/orders" element={<Shell><OrdersListPage /></Shell>} />
      <Route path="/orders/new" element={<Shell><OrderCreatePage /></Shell>} />
      <Route path="/orders/:id" element={<Shell><OrderDetailPage /></Shell>} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
