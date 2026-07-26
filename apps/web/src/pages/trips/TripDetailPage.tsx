import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stamp } from "@/components/status/Stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTrip } from "@/api/trips.api";

export function TripDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>{t("common.loading")}</div>;
  }

  if (!trip) {
    return <div>{t("common.notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trip.tripNumber}</h1>
          <p className="text-sm text-muted-foreground">{trip.tripType}</p>
        </div>
        <div className="text-right">
          <Stamp status={trip.status}>{t(`trip.status.${trip.status}`)}</Stamp>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="summary">{t("common.summary")}</TabsTrigger>
          <TabsTrigger value="manifest">{t("trip.manifest")}</TabsTrigger>
          <TabsTrigger value="route">{t("trip.route")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("trip.tasks")}</TabsTrigger>
          <TabsTrigger value="history">{t("common.history")}</TabsTrigger>
          <TabsTrigger value="audit">{t("common.audit")}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
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
                <p>{trip.plannedStartTime ? new Date(trip.plannedStartTime).toLocaleString() : "-"}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {t("trip.plannedEndTime")}
                </h3>
                <p>{trip.plannedEndTime ? new Date(trip.plannedEndTime).toLocaleString() : "-"}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="manifest">
          {trip.manifest ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{trip.manifest.manifestNumber}</h3>
                <Stamp status={trip.manifest.status}>
                  {t(`manifest.status.${trip.manifest.status}`)}
                </Stamp>
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
        </TabsContent>

        <TabsContent value="route">
          {trip.route ? (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">{trip.route.name}</h3>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t("trip.stops")}</h4>
                <ul className="space-y-2">
                  {trip.route.stops?.map((stop: any, i: number) => (
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
        </TabsContent>

        <TabsContent value="tasks">
          {trip.tasks && trip.tasks.length > 0 ? (
            <Card className="p-6 space-y-4">
              <ul className="space-y-2">
                {trip.tasks.map((task: any) => (
                  <li key={task.id} className="text-sm flex justify-between">
                    <span>{task.taskNumber}</span>
                    <Stamp status={task.status}>{t(`task.status.${task.status}`)}</Stamp>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card className="p-6">
              <p>{t("trip.noTasks")}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
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
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              {t("common.auditLogNotImplemented")}
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
