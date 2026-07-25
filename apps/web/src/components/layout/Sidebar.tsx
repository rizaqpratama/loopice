import { LayoutDashboard, Package, Palette, Users, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { RoleGate } from "@/components/RoleGate";
import { useTenantBranding } from "@/context/TenantBrandingContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/orders", label: "Orders", icon: Package },
];

const settingsItems = [
  { to: "/settings/branding", label: "Branding", icon: Palette },
  { to: "/settings/users", label: "Users", icon: UsersRound },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "group relative flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors",
    isActive ? "text-brand-primary" : "text-foreground/70 hover:bg-muted hover:text-foreground"
  );
}

function NavTick({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-primary transition-opacity",
        isActive ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export function Sidebar() {
  const { branding } = useTenantBranding();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.name}
            className="h-8 w-8 rounded-sm object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-primary font-display text-sm font-bold text-white">
            {(branding?.name ?? "L").charAt(0)}
          </div>
        )}
        <span className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
          {branding?.name ?? "Loopice"}
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <NavTick isActive={isActive} />
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}

        <RoleGate allow={["TENANT_ADMIN"]}>
          <div className="mt-5 border-t border-border pt-4">
            <p className="px-4 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Settings
            </p>
            <div className="flex flex-col gap-0.5">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        <NavTick isActive={isActive} />
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </RoleGate>
      </nav>
    </aside>
  );
}
