import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { createTrip } from "@/api/trips.api";
import { listStations } from "@/api/stations.api";
import { listVehicles } from "@/api/vehicles.api";
import { listDrivers } from "@/api/drivers.api";
import { TRIP_TYPES, TRANSFER_TYPES } from "@loopice/shared";

export function TripCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFacilityTransfer, setIsFacilityTransfer] = useState(false);
  const [formData, setFormData] = useState({
    tripType: "DIRECT_DELIVERY",
    transferType: "",
    originFacilityId: "",
    destinationFacilityId: "",
    vehicleId: "",
    primaryDriverId: "",
    plannedStartTime: "",
    plannedEndTime: "",
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: () => listStations(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => listVehicles(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => listDrivers(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createTrip(data),
    onSuccess: (res: any) => {
      navigate(`/trips/${res.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      tripType: formData.tripType,
      transferType: isFacilityTransfer ? formData.transferType : undefined,
      originFacilityId: formData.originFacilityId || undefined,
      destinationFacilityId: formData.destinationFacilityId || undefined,
      vehicleId: formData.vehicleId || undefined,
      primaryDriverId: formData.primaryDriverId || undefined,
      plannedStartTime: formData.plannedStartTime || undefined,
      plannedEndTime: formData.plannedEndTime || undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">{t("trip.create")}</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="facility-transfer"
              checked={isFacilityTransfer}
              onChange={(e) => setIsFacilityTransfer(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="facility-transfer" className="text-sm font-medium">
              {t("trip.facilityTransfer")}
            </label>
          </div>

          {isFacilityTransfer ? (
            <>
              <Select
                label={t("trip.transferType")}
                options={TRANSFER_TYPES.map((t) => ({
                  value: t,
                  label: t,
                }))}
                value={formData.transferType}
                onChange={(value) =>
                  setFormData({ ...formData, transferType: value })
                }
                required
              />
              <Combobox
                label={t("trip.originFacility")}
                options={facilities.map((f: any) => ({
                  value: f.id,
                  label: f.name,
                }))}
                value={formData.originFacilityId}
                onChange={(value) =>
                  setFormData({ ...formData, originFacilityId: value })
                }
                required
              />
              <Combobox
                label={t("trip.destinationFacility")}
                options={facilities.map((f: any) => ({
                  value: f.id,
                  label: f.name,
                }))}
                value={formData.destinationFacilityId}
                onChange={(value) =>
                  setFormData({ ...formData, destinationFacilityId: value })
                }
                required
              />
            </>
          ) : (
            <Select
              label={t("trip.type")}
              options={TRIP_TYPES.map((t) => ({
                value: t,
                label: t(`trip.type.${t}`),
              }))}
              value={formData.tripType}
              onChange={(value) =>
                setFormData({ ...formData, tripType: value })
              }
              required
            />
          )}

          <Combobox
            label={t("trip.vehicle")}
            options={vehicles.map((v: any) => ({
              value: v.id,
              label: v.licensePlate,
            }))}
            value={formData.vehicleId}
            onChange={(value) => setFormData({ ...formData, vehicleId: value })}
          />

          <Combobox
            label={t("trip.driver")}
            options={drivers.map((d: any) => ({
              value: d.id,
              label: `${d.firstName} ${d.lastName}`,
            }))}
            value={formData.primaryDriverId}
            onChange={(value) =>
              setFormData({ ...formData, primaryDriverId: value })
            }
          />

          <Input
            label={t("trip.plannedStartTime")}
            type="datetime-local"
            value={formData.plannedStartTime}
            onChange={(e) =>
              setFormData({ ...formData, plannedStartTime: e.target.value })
            }
          />

          <Input
            label={t("trip.plannedEndTime")}
            type="datetime-local"
            value={formData.plannedEndTime}
            onChange={(e) =>
              setFormData({ ...formData, plannedEndTime: e.target.value })
            }
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/trips")}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t("common.loading") : t("trip.create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
