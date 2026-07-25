import { useAuth } from "@/context/AuthContext";
import { useTenantBranding } from "@/context/TenantBrandingContext";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { branding } = useTenantBranding();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        {branding?.logoUrl && (
          <img src={branding.logoUrl} alt={branding.name} className="h-7 w-7 rounded" />
        )}
        <span className="font-semibold text-foreground">{branding?.name ?? "Loopice"}</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName} &middot; {user.role}
          </span>
          <Button variant="outline" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      )}
    </header>
  );
}
