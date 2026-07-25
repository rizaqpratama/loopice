import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { TenantBrandingProvider } from "@/context/TenantBrandingContext";
import { AppRouter } from "@/router";

export function App() {
  return (
    <BrowserRouter>
      <TenantBrandingProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </TenantBrandingProvider>
    </BrowserRouter>
  );
}
