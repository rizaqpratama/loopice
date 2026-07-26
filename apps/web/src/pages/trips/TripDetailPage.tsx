import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { TripStatusStamp } from "./tripStatusStamp";
import { getTrip } from "@/api/trips.api";

export function TripDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => {
    if (id) {
      setLoading(true);
      getTrip(id)
        .then(setTrip)
        .catch(() => navigate("/trips"))
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  if (loading) {
    return <div>{t("common.loading")}</div>;
  }

  if (!trip) {
    return <div>{t("common.notFound")}</div>;
  }

  const tabs = [
    { value: "summary", label: t("common.summary") },
    { value: "manifest", label: t("trip.manifest") },
    { value: "route", label: t("trip.route") },
    { value: "tasks", label: t("trip.tasks") },
    { value: "history", label: t("common.history") },
    { value: "audit", label: t("common.audit") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trip.tripNumber}</h1>
          <p className="text-sm text-muted-foreground">{trip.tripType}</p>
        </div>
        <div className="text-right">
          <TripStatusStamp status={trip.status} />
        </div>
      </div>

      <Tabs value={activeTab} onChange={setActiveTab} className="w-full" items={tabs} />

      {activeTab === "summary" && (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.vehicle")}
              </h3>
              <p>{trip.vehicle?.licensePlate || t("common.unassigned")}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.driver")}
              </h3>
              <p>
                {trip.primaryDriver
                  ? `${trip.primaryDriver.firstName} ${trip.primaryDriver.lastName}`
                  : t("common.unassigned")}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.originFacility")}
              </h3>
              <p>{trip.originFacility?.name || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.destinationFacility")}
              </h3>
              <p>{trip.destinationFacility?.name || "-"}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.plannedStartTime")}
              </h3>
              <p>
                {trip.plannedStartTime
                  ? new Date(trip.plannedStartTime).toLocaleString()
                  : "-"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {t("trip.plannedEndTime")}
              </h3>
              <p>
                {trip.plannedEndTime ? new Date(trip.plannedEndTime).toLocaleString() : "-"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "manifest" && (
        <>
          {trip.manifest ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{trip.manifest.manifestNumber}</h3>
                <span className="text-sm">{trip.manifest.status}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t("trip.items")}</h4>
                <ul className="space-y-2">
                  {trip.manifest.items?.map((item: any) => (
                    <li key={item.id} className="text-sm">
                      <span className="font-mono">{item.identifier}</span>
                      {" - "}
                      <span>{item.plannedQuantity} units</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p>{t("trip.noManifest")}</p>
            </Card>
          )}
        </>
      )}

      {activeTab === "route" && (
        <>
          {trip.activeRoute ? (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">{trip.activeRoute.name}</h3>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t("trip.stops")}</h4>
                <ul className="space-y-2">
                  {trip.activeRoute.stops?.map((stop: any, i: number) => (
                    <li key={stop.id} className="text-sm">
                      {i + 1}. {stop.locationName || stop.facility?.name}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p>{t("trip.noRoute")}</p>
            </Card>
          )}
        </>
      )}

      {activeTab === "tasks" && (
        <>
          {trip.tasks && trip.tasks.length > 0 ? (
            <Card className="p-6 space-y-4">
              <ul className="space-y-2">
                {trip.tasks.map((task: any) => (
                  <li key={task.id} className="text-sm flex justify-between">
                    <span>{task.taskNumber}</span>
                    <span>{task.status}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="p-6">
              <p>{t("trip.noTasks")}</p>
            </Card>
          )}
        </>
      )}

      {activeTab === "history" && (
        <Card className="p-6">
          <ul className="space-y-3">
            {trip.statusHistory?.map((record: any, i: number) => (
              <li key={i} className="text-sm border-b pb-3 last:border-0">
                <div className="flex justify-between">
                  <span className="font-semibold">{t(`trip.status.${record.status}`)}</span>
                  <span className="text-muted-foreground">
                    {new Date(record.changedAt).toLocaleString()}
                  </span>
                </div>
                {record.note && <p className="text-muted-foreground">{record.note}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {activeTab === "audit" && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            {t("common.auditLogNotImplemented")}
          </p>
        </Card>
      )}
    </div>
  );
}
