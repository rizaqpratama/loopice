import { NavLink } from "react-router-dom";
import { RoleGate } from "@/components/RoleGate";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/customers", label: "Customers" },
  { to: "/orders", label: "Orders" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted",
                isActive && "bg-brand-primary/15 text-brand-primary"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}

        <RoleGate allow={["TENANT_ADMIN"]}>
          <div className="mt-4 border-t border-border pt-3">
            <p className="px-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">
              Settings
            </p>
            <NavLink
              to="/settings/branding"
              className={({ isActive }) =>
                cn(
                  "block rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted",
                  isActive && "bg-brand-primary/15 text-brand-primary"
                )
              }
            >
              Branding
            </NavLink>
            <NavLink
              to="/settings/users"
              className={({ isActive }) =>
                cn(
                  "block rounded-sm px-3 py-2 text-sm font-medium text-foreground hover:bg-muted",
                  isActive && "bg-brand-primary/15 text-brand-primary"
                )
              }
            >
              Users
            </NavLink>
          </div>
        </RoleGate>
      </nav>
    </aside>
  );
}
