import type { TenantBranding } from "@loopice/shared";
import * as React from "react";
import * as tenantsApi from "@/api/tenants.api";

interface TenantBrandingContextValue {
  branding: TenantBranding | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TenantBrandingContext = React.createContext<TenantBrandingContextValue | undefined>(
  undefined
);

function applyCssVars(branding: TenantBranding) {
  document.documentElement.style.setProperty("--brand-primary", branding.primaryColor);
  document.documentElement.style.setProperty("--brand-secondary", branding.secondaryColor);
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await tenantsApi.getBranding();
      setBranding(data);
      applyCssVars(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant branding");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <TenantBrandingContext.Provider value={{ branding, isLoading, error, refresh }}>
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  const ctx = React.useContext(TenantBrandingContext);
  if (!ctx) throw new Error("useTenantBranding must be used within TenantBrandingProvider");
  return ctx;
}
