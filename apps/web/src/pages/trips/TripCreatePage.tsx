import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTrip } from "@/api/trips.api";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await createTrip({
        tripType: formData.tripType as any,
        transferType: isFacilityTransfer ? (formData.transferType as any) : undefined,
        originFacilityId: formData.originFacilityId || undefined,
        destinationFacilityId: formData.destinationFacilityId || undefined,
        vehicleId: formData.vehicleId || undefined,
        primaryDriverId: formData.primaryDriverId || undefined,
        plannedStartTime: formData.plannedStartTime || undefined,
        plannedEndTime: formData.plannedEndTime || undefined,
      });
      navigate(`/trips/${res.id}`);
    } catch (err) {
      alert(t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
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
            <Label htmlFor="facility-transfer" className="text-sm font-medium">
              {t("trip.facilityTransfer")}
            </Label>
          </div>

          {isFacilityTransfer ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transfer-type">{t("trip.transferType")}</Label>
                <Select
                  id="transfer-type"
                  value={formData.transferType}
                  onChange={(e) => setFormData({ ...formData, transferType: e.target.value })}
                  required
                >
                  <option value="">{t("common.select")}</option>
                  {TRANSFER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="origin">{t("trip.originFacility")}</Label>
                <Input
                  id="origin"
                  value={formData.originFacilityId}
                  onChange={(e) => setFormData({ ...formData, originFacilityId: e.target.value })}
                  placeholder={t("common.facilityId")}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destination">{t("trip.destinationFacility")}</Label>
                <Input
                  id="destination"
                  value={formData.destinationFacilityId}
                  onChange={(e) =>
                    setFormData({ ...formData, destinationFacilityId: e.target.value })
                  }
                  placeholder={t("common.facilityId")}
                  required
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip-type">{t("trip.type")}</Label>
              <Select
                id="trip-type"
                value={formData.tripType}
                onChange={(e) => setFormData({ ...formData, tripType: e.target.value })}
                required
              >
                {TRIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`trip.type.${type}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicle">{t("trip.vehicle")}</Label>
            <Input
              id="vehicle"
              value={formData.vehicleId}
              onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
              placeholder={t("common.vehicleId")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="driver">{t("trip.driver")}</Label>
            <Input
              id="driver"
              value={formData.primaryDriverId}
              onChange={(e) => setFormData({ ...formData, primaryDriverId: e.target.value })}
              placeholder={t("common.driverId")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start-time">{t("trip.plannedStartTime")}</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={formData.plannedStartTime}
              onChange={(e) => setFormData({ ...formData, plannedStartTime: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end-time">{t("trip.plannedEndTime")}</Label>
            <Input
              id="end-time"
              type="datetime-local"
              value={formData.plannedEndTime}
              onChange={(e) => setFormData({ ...formData, plannedEndTime: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/trips")}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.loading") : t("trip.create")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
