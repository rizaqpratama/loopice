import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Vehicle } from "@/api/vehicles.api";
import * as vehiclesApi from "@/api/vehicles.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function VehiclesSettingsPage() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ plateNumber: "", type: "", capacityKg: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setVehicles(await vehiclesApi.listVehicles());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await vehiclesApi.createVehicle({
        plateNumber: form.plateNumber,
        type: form.type,
        capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
      });
      setForm({ plateNumber: "", type: "", capacityKg: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.vehicles.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await vehiclesApi.deactivateVehicle(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.vehicles.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.vehicles.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.vehicles.newVehicle")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder={t("settings.vehicles.platePlaceholder")}
                required
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
              />
              <Input
                placeholder={t("settings.vehicles.typePlaceholder")}
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t("settings.vehicles.capacityPlaceholder")}
                value={form.capacityKg}
                onChange={(e) => setForm({ ...form, capacityKg: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-3">
                {isSubmitting ? t("common.saving") : t("settings.vehicles.createVehicle")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.vehicles.colPlate")}</TableHead>
              <TableHead>{t("settings.vehicles.colType")}</TableHead>
              <TableHead>{t("settings.vehicles.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-mono text-xs font-medium text-foreground">
                  {vehicle.plateNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">{vehicle.type}</TableCell>
                <TableCell>
                  <Badge variant={vehicle.status === "ACTIVE" ? "success" : "secondary"}>
                    {t(`vehicleStatus.${vehicle.status}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {vehicle.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(vehicle.id)}>
                      {t("settings.vehicles.deactivate")}
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
