import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useTenantBranding } from "@/context/TenantBrandingContext";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

function RouteMap() {
  return (
    <svg viewBox="0 0 400 400" fill="none" className="h-full w-full" aria-hidden>
      <path
        d="M40 340 C 120 340, 100 220, 190 210 S 300 120, 280 60"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1.5"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <path
        d="M40 340 C 120 340, 100 220, 190 210 S 300 120, 280 60"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="1.5"
        strokeDasharray="6 500"
      />
      <circle cx="40" cy="340" r="5" fill="white" fillOpacity="0.9" />
      <circle cx="190" cy="210" r="4" fill="white" fillOpacity="0.5" />
      <circle cx="280" cy="60" r="6" fill="white" />
      <circle cx="280" cy="60" r="11" stroke="white" strokeOpacity="0.5" />
    </svg>
  );
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { branding } = useTenantBranding();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-primary p-10 text-white md:flex">
        <div className="absolute inset-0 opacity-80">
          <RouteMap />
        </div>
        <div className="relative flex items-center gap-2.5">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.name} className="h-8 w-8 rounded-sm" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-white/15 font-display text-sm font-bold">
              {(branding?.name ?? "L").charAt(0)}
            </div>
          )}
          <span className="font-display text-lg font-semibold tracking-tight">
            {branding?.name ?? "Loopice"}
          </span>
        </div>
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.15em] opacity-70">
            {t("auth.dispatchFleetOps")}
          </p>
          <p className="mt-2 max-w-xs font-display text-2xl font-medium leading-snug">
            {t("auth.tagline")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 md:hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.name} className="h-8 w-8 rounded-sm" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-primary font-display text-sm font-bold text-white">
                  {(branding?.name ?? "L").charAt(0)}
                </div>
              )}
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                {branding?.name ?? "Loopice"}
              </span>
            </div>
            <LanguageSwitcher />
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("auth.welcomeBack")}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.signInToDispatch")}
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
