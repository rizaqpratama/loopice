import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {TODAY}
      </p>

      {user && (
        <div className="flex items-center gap-3">
          <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {user.role.replace("_", " ")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      )}
    </header>
  );
}
