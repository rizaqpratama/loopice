import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TASK_PRIORITIES, type TaskPriority } from "@loopice/shared";
import * as customersApi from "@/api/customers.api";
import type { Customer } from "@/api/customers.api";
import * as taskTypesApi from "@/api/taskTypes.api";
import type { TaskTypeConfig } from "@/api/taskTypes.api";
import * as stationsApi from "@/api/stations.api";
import type { Station } from "@/api/stations.api";
import * as tasksApi from "@/api/tasks.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TaskCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const serviceOrderId = searchParams.get("serviceOrderId") ?? undefined;

  const [taskTypes, setTaskTypes] = React.useState<TaskTypeConfig[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [stations, setStations] = React.useState<Station[]>([]);

  const [taskTypeId, setTaskTypeId] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("NORMAL");
  const [customerId, setCustomerId] = React.useState("");
  const [facilityId, setFacilityId] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    taskTypesApi.listTaskTypes().then(setTaskTypes);
    customersApi.listCustomers({ limit: 100 }).then((res) => setCustomers(res.items));
    stationsApi.listStations().then(setStations);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const task = await tasksApi.createTask(
        {
          taskTypeId,
          priority,
          customerId: customerId || undefined,
          facilityId: facilityId || undefined,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          instructions: instructions || undefined,
        },
        serviceOrderId
      );
      navigate(`/tasks/${task.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("tasks.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("tasks.backLink")}
        </Link>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {t("tasks.createEyebrow")}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {t("tasks.createTitle")}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tasks.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taskType">{t("tasks.type")}</Label>
              <Select id="taskType" required value={taskTypeId} onChange={(e) => setTaskTypeId(e.target.value)}>
                <option value="" disabled>
                  {t("tasks.selectType")}
                </option>
                {taskTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">{t("tasks.priority")}</Label>
              <Select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(`taskPriority.${p}`)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer">{t("tasks.customer")}</Label>
              <Select id="customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{t("tasks.noCustomer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="facility">{t("tasks.facility")}</Label>
              <Select id="facility" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}>
                <option value="">{t("tasks.noFacility")}</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduledDate">{t("tasks.scheduledDate")}</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructions">{t("tasks.instructions")}</Label>
              <Input
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("tasks.instructionsPlaceholder")}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting || !taskTypeId}>
              {isSubmitting ? t("tasks.creating") : t("tasks.create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
