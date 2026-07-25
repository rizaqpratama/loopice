import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Driver } from "@/api/drivers.api";
import * as driversApi from "@/api/drivers.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DriversSettingsPage() {
  const { t } = useTranslation();
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", phone: "", licenseNumber: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setDrivers(await driversApi.listDrivers());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await driversApi.createDriver({
        name: form.name,
        phone: form.phone || undefined,
        licenseNumber: form.licenseNumber || undefined,
      });
      setForm({ name: "", phone: "", licenseNumber: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.drivers.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await driversApi.deactivateDriver(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.drivers.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.drivers.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.drivers.newDriver")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder={t("settings.drivers.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("settings.drivers.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder={t("settings.drivers.licensePlaceholder")}
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-3">
                {isSubmitting ? t("common.saving") : t("settings.drivers.createDriver")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.drivers.colName")}</TableHead>
              <TableHead>{t("settings.drivers.colPhone")}</TableHead>
              <TableHead>{t("settings.drivers.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell className="font-medium text-foreground">{driver.name}</TableCell>
                <TableCell className="text-muted-foreground">{driver.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={driver.status === "ACTIVE" ? "success" : "secondary"}>
                    {t(`driverStatus.${driver.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {driver.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(driver.id)}>
                      {t("settings.drivers.deactivate")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
