import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TripStatusStamp } from "./tripStatusStamp";
import { listTrips } from "@/api/trips.api";
import { TRIP_STATUSES } from "@loopice/shared";

export function TripListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    driverId: "",
    vehicleId: "",
    skip: 0,
    take: 50,
  });

  useEffect(() => {
    setLoading(true);
    listTrips({
      status: filters.status ? (filters.status as any) : undefined,
      driverId: filters.driverId || undefined,
      vehicleId: filters.vehicleId || undefined,
      skip: filters.skip,
      take: filters.take,
    })
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("trip.list")}</h1>
        <Button onClick={() => navigate("/trips/new")}>{t("trip.create")}</Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status-filter">{t("trip.status")}</Label>
              <Select
                id="status-filter"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, skip: 0 })}
              >
                <option value="">{t("common.all")}</option>
                {TRIP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`trip.status.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="driver-filter">{t("trip.driver")}</Label>
              <Input
                id="driver-filter"
                value={filters.driverId}
                onChange={(e) => setFilters({ ...filters, driverId: e.target.value, skip: 0 })}
                placeholder={t("common.filter")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle-filter">{t("trip.vehicle")}</Label>
              <Input
                id="vehicle-filter"
                value={filters.vehicleId}
                onChange={(e) => setFilters({ ...filters, vehicleId: e.target.value, skip: 0 })}
                placeholder={t("common.filter")}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => setFilters({ ...filters, skip: 0 })}>
                {t("common.search")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("trip.tripNumber")}</TableHead>
              <TableHead>{t("trip.type")}</TableHead>
              <TableHead>{t("trip.status")}</TableHead>
              <TableHead>{t("trip.driver")}</TableHead>
              <TableHead>{t("trip.vehicle")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-mono">{trip.tripNumber}</TableCell>
                  <TableCell>{t(`trip.type.${trip.tripType}`)}</TableCell>
                  <TableCell>
                    <TripStatusStamp status={trip.status} />
                  </TableCell>
                  <TableCell>{trip.primaryDriver?.firstName || "-"}</TableCell>
                  <TableCell>{trip.vehicle?.licensePlate || "-"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                    >
                      {t("common.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
