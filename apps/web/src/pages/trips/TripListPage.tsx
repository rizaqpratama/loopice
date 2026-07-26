import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Stamp } from "@/components/status/Stamp";
import { listTrips } from "@/api/trips.api";
import { TRIP_STATUSES } from "@loopice/shared";

export function TripListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "",
    driver: "",
    vehicle: "",
    skip: 0,
    take: 50,
  });

  const { data: trips = [], isLoading: loading } = useQuery({
    queryKey: ["trips", filters],
    queryFn: () => listTrips(filters),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("trip.list")}</h1>
        <Button onClick={() => navigate("/trips/new")}>{t("trip.create")}</Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Select
              label={t("trip.status")}
              options={TRIP_STATUSES.map((s) => ({ value: s, label: t(`trip.status.${s}`) }))}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value, skip: 0 })}
              nullable
            />
            <Input
              label={t("trip.driver")}
              value={filters.driver}
              onChange={(e) => setFilters({ ...filters, driver: e.target.value, skip: 0 })}
              placeholder={t("trip.driverPlaceholder")}
            />
            <Input
              label={t("trip.vehicle")}
              value={filters.vehicle}
              onChange={(e) => setFilters({ ...filters, vehicle: e.target.value, skip: 0 })}
              placeholder={t("trip.vehiclePlaceholder")}
            />
            <Button variant="secondary" className="mt-8" onClick={() => {}}>
              {t("common.search")}
            </Button>
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
            {trips.map((trip) => (
              <TableRow key={trip.id} onClick={() => navigate(`/trips/${trip.id}`)}>
                <TableCell className="font-mono">{trip.tripNumber}</TableCell>
                <TableCell>{t(`trip.type.${trip.tripType}`)}</TableCell>
                <TableCell>
                  <Stamp status={trip.status}>{t(`trip.status.${trip.status}`)}</Stamp>
                </TableCell>
                <TableCell>{trip.primaryDriver?.firstName || "-"}</TableCell>
                <TableCell>{trip.vehicle?.licensePlate || "-"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trips/${trip.id}`);
                    }}
                  >
                    {t("common.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
