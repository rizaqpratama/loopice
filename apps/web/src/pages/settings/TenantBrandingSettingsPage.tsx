import * as React from "react";
import { useTenantBranding } from "@/context/TenantBrandingContext";
import * as tenantsApi from "@/api/tenants.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TenantBrandingSettingsPage() {
  const { branding, refresh } = useTenantBranding();
  const [name, setName] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [primaryColor, setPrimaryColor] = React.useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = React.useState("#1E293B");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!branding) return;
    setName(branding.name);
    setLogoUrl(branding.logoUrl ?? "");
    setPrimaryColor(branding.primaryColor);
    setSecondaryColor(branding.secondaryColor);
  }, [branding]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await tenantsApi.updateMyTenant({
        name,
        logoUrl: logoUrl || null,
        primaryColor,
        secondaryColor,
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update branding");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Branding</h1>

      <Card>
        <CardHeader>
          <CardTitle>Whitelabel settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="primaryColor">Primary color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="secondaryColor">Secondary color</Label>
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Saved.</p>}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save branding"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
