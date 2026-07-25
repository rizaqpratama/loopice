import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Topbar() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const today = new Date().toLocaleDateString(i18n.language, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {today}
      </p>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {user && (
          <div className="flex items-center gap-3">
            <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t(`role.${user.role}`)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} aria-label={t("auth.logOut")}>
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
