import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Station } from "@/api/stations.api";
import * as stationsApi from "@/api/stations.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function StationsSettingsPage() {
  const { t } = useTranslation();
  const [stations, setStations] = React.useState<Station[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ code: "", name: "", city: "", address: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setStations(await stationsApi.listStations());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await stationsApi.createStation({
        code: form.code,
        name: form.name,
        city: form.city,
        address: form.address || undefined,
      });
      setForm({ code: "", name: "", city: "", address: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.stations.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await stationsApi.deactivateStation(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.stations.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.stations.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.stations.newStation")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder={t("settings.stations.codePlaceholder")}
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <Input
                placeholder={t("settings.stations.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("settings.stations.cityPlaceholder")}
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                placeholder={t("settings.stations.addressPlaceholder")}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
                {isSubmitting ? t("common.saving") : t("settings.stations.createStation")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.stations.colCode")}</TableHead>
              <TableHead>{t("settings.stations.colName")}</TableHead>
              <TableHead>{t("settings.stations.colCity")}</TableHead>
              <TableHead>{t("settings.stations.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((station) => (
              <TableRow key={station.id}>
                <TableCell className="font-mono text-xs font-medium text-foreground">
                  {station.code}
                </TableCell>
                <TableCell className="font-medium text-foreground">{station.name}</TableCell>
                <TableCell className="text-muted-foreground">{station.city}</TableCell>
                <TableCell>
                  <Badge variant={station.isActive ? "success" : "secondary"}>
                    {station.isActive
                      ? t("settings.stations.active")
                      : t("settings.stations.deactivated")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {station.isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(station.id)}>
                      {t("settings.stations.deactivate")}
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
