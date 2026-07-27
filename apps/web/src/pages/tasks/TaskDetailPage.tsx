import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DEPENDENCY_TYPES,
  EXCEPTION_TYPES,
  PROOF_TYPES,
  TASK_STATUS_TRANSITIONS,
  type DependencyType,
  type ExceptionType,
  type ProofType,
  type TaskStatus,
} from "@loopice/shared";
import * as tasksApi from "@/api/tasks.api";
import type { Task, TaskDependencyEdge } from "@/api/tasks.api";
import * as driversApi from "@/api/drivers.api";
import type { Driver } from "@/api/drivers.api";
import * as vehiclesApi from "@/api/vehicles.api";
import type { Vehicle } from "@/api/vehicles.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { TaskStatusStamp } from "./taskStatusBadge";

type ActionKind = "simple" | "assign" | "unassign" | "cancel" | "reschedule" | "fail" | "complete" | "partial";

function actionKindFor(from: TaskStatus, to: TaskStatus): ActionKind {
  if (to === "CANCELLED") return "cancel";
  if (to === "RESCHEDULED") return "reschedule";
  if (to === "FAILED") return "fail";
  if (to === "COMPLETED") return "complete";
  if (to === "PARTIALLY_COMPLETED") return "partial";
  if (to === "ASSIGNED" && from === "UNASSIGNED") return "assign";
  if (to === "UNASSIGNED" && from === "ASSIGNED") return "unassign";
  return "simple";
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [task, setTask] = React.useState<Task | null>(null);
  const [tab, setTab] = React.useState("overview");
  const [error, setError] = React.useState<string | null>(null);
  const [transitioning, setTransitioning] = React.useState(false);

  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [otherTasks, setOtherTasks] = React.useState<Task[]>([]);

  const [dialog, setDialog] = React.useState<ActionKind | null>(null);
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [isDialogSaving, setIsDialogSaving] = React.useState(false);

  const [assignDriverId, setAssignDriverId] = React.useState("");
  const [assignVehicleId, setAssignVehicleId] = React.useState("");
  const [assignOverride, setAssignOverride] = React.useState(false);
  const [assignOverrideReason, setAssignOverrideReason] = React.useState("");

  const [cancelReason, setCancelReason] = React.useState("");
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleReason, setRescheduleReason] = React.useState("");
  const [failType, setFailType] = React.useState<ExceptionType>("OTHER");
  const [failNote, setFailNote] = React.useState("");
  const [completeProofType, setCompleteProofType] = React.useState<ProofType>("PHOTO");
  const [completeProofValue, setCompleteProofValue] = React.useState("");
  const [partialNote, setPartialNote] = React.useState("");

  const [depTaskId, setDepTaskId] = React.useState("");
  const [depType, setDepType] = React.useState<DependencyType>("FINISH_TO_START");
  const [depDirection, setDepDirection] = React.useState<"predecessor" | "successor">("predecessor");
  const [dependencies, setDependencies] = React.useState<{
    asPredecessor: TaskDependencyEdge[];
    asSuccessor: TaskDependencyEdge[];
  } | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    const [t, deps] = await Promise.all([tasksApi.getTask(id), tasksApi.listDependencies(id)]);
    setTask(t);
    setDependencies(deps);
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    driversApi.listDrivers().then(setDrivers);
    vehiclesApi.listVehicles().then(setVehicles);
    tasksApi.listTasks({ limit: 100 }).then((res) => setOtherTasks(res.items));
  }, []);

  function closeDialog() {
    setDialog(null);
    setDialogError(null);
    setAssignDriverId("");
    setAssignVehicleId("");
    setAssignOverride(false);
    setAssignOverrideReason("");
    setCancelReason("");
    setRescheduleDate("");
    setRescheduleReason("");
    setFailNote("");
    setCompleteProofValue("");
    setPartialNote("");
  }

  async function handleTransition(status: TaskStatus) {
    if (!task) return;
    const kind = actionKindFor(task.status, status);
    if (kind !== "simple") {
      setDialog(kind);
      return;
    }
    setError(null);
    setTransitioning(true);
    try {
      const updated = await tasksApi.updateTaskStatus(task.id, status, task.version);
      setTask(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("tasks.failedToUpdateStatus"));
    } finally {
      setTransitioning(false);
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      const updated = await tasksApi.assignTask(
        task.id,
        {
          assignedDriverId: assignDriverId || undefined,
          assignedVehicleId: assignVehicleId || undefined,
          override: assignOverride || undefined,
          overrideReason: assignOverride ? assignOverrideReason : undefined,
        },
        task.version
      );
      setTask(updated);
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToAssign"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handleUnassign() {
    if (!task) return;
    setError(null);
    try {
      const updated = await tasksApi.unassignTask(task.id, task.version);
      setTask(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("tasks.failedToUnassign"));
    }
  }

  async function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      const updated = await tasksApi.cancelTask(task.id, cancelReason, task.version);
      setTask(updated);
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToCancel"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handleRescheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      await tasksApi.rescheduleTask(
        task.id,
        {
          reason: rescheduleReason,
          scheduledDate: rescheduleDate ? new Date(rescheduleDate).toISOString() : undefined,
        },
        task.version
      );
      await load();
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToReschedule"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handleFailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      const updated = await tasksApi.failTask(task.id, failType, task.version, failNote || undefined);
      setTask(updated);
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToFail"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      const proof = completeProofValue
        ? [{ type: completeProofType, textValue: completeProofValue }]
        : undefined;
      const updated = await tasksApi.completeTask(task.id, task.version, proof);
      setTask(updated);
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToComplete"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handlePartialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setDialogError(null);
    setIsDialogSaving(true);
    try {
      const updated = await tasksApi.partialCompleteTask(task.id, partialNote, task.version);
      setTask(updated);
      closeDialog();
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t("tasks.failedToPartialComplete"));
    } finally {
      setIsDialogSaving(false);
    }
  }

  async function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !depTaskId) return;
    try {
      const deps = await tasksApi.addDependency(task.id, {
        relatedTaskId: depTaskId,
        type: depType,
        direction: depDirection,
      });
      setDependencies(deps);
      setDepTaskId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("tasks.failedToAddDependency"));
    }
  }

  async function handleRemoveDependency(dependencyId: string) {
    if (!task) return;
    await tasksApi.removeDependency(task.id, dependencyId);
    setDependencies(await tasksApi.listDependencies(task.id));
  }

  if (!task) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  const nextStatuses = TASK_STATUS_TRANSITIONS[task.status];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("tasks.backLink")}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {task.taskType.name}
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              <span className="font-mono">{task.taskNumber}</span>
            </h1>
            {task.serviceOrder && (
              <Link
                to={`/service-orders/${task.serviceOrderId}`}
                className="text-sm text-brand-primary hover:underline"
              >
                {task.serviceOrder.soNumber}
              </Link>
            )}
          </div>
          <TaskStatusStamp status={task.status} className="scale-125" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tasks.actions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {nextStatuses.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("tasks.noTransitions")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === "CANCELLED" || status === "FAILED" ? "destructive" : "default"}
                disabled={transitioning}
                onClick={() => handleTransition(status)}
              >
                {t("tasks.mark", { status: t(`taskStatus.${status}`) })}
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Tabs
        items={[
          { value: "overview", label: t("tasks.tabOverview") },
          { value: "assignment", label: t("tasks.tabAssignment") },
          { value: "cargo", label: t("tasks.tabCargo") },
          { value: "dependencies", label: t("tasks.tabDependencies") },
          { value: "activity", label: t("tasks.tabActivity") },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 text-sm text-foreground">
            <p>{task.instructions ?? t("tasks.noInstructions")}</p>
            {task.notes && <p className="text-muted-foreground">{task.notes}</p>}
            <div className="mt-1 flex flex-col gap-1 border-t border-border pt-3 text-muted-foreground">
              <p>
                <span className="text-foreground">{t("tasks.priority")}:</span> {t(`taskPriority.${task.priority}`)}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.customer")}:</span> {task.customer?.name ?? "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.facility")}:</span>{" "}
                {task.facility ? `${task.facility.code} — ${task.facility.name}` : "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.scheduledDate")}:</span>{" "}
                {task.scheduledDate ? new Date(task.scheduledDate).toLocaleString() : "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.timeWindow")}:</span>{" "}
                {task.timeWindowStart && task.timeWindowEnd
                  ? `${new Date(task.timeWindowStart).toLocaleTimeString()} – ${new Date(task.timeWindowEnd).toLocaleTimeString()}`
                  : "—"}
              </p>
              <p className="font-mono text-xs">
                {t("tasks.createdLabel", { date: new Date(task.createdAt).toLocaleString() })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "assignment" && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4 text-sm text-foreground">
            <div className="flex flex-col gap-1 text-muted-foreground">
              <p>
                <span className="text-foreground">{t("tasks.driver")}:</span> {task.assignedDriver?.name ?? "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.vehicle")}:</span>{" "}
                {task.assignedVehicle?.plateNumber ?? "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.trip")}:</span> {task.trip?.tripNumber ?? "—"}
              </p>
              <p>
                <span className="text-foreground">{t("tasks.route")}:</span> {task.route?.name ?? "—"}
              </p>
            </div>
            {task.status === "UNASSIGNED" && (
              <Button size="sm" onClick={() => setDialog("assign")} className="w-fit">
                {t("tasks.assign")}
              </Button>
            )}
            {task.status === "ASSIGNED" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setDialog("assign")}>
                  {t("tasks.reassign")}
                </Button>
                <Button size="sm" variant="outline" onClick={handleUnassign}>
                  {t("tasks.unassign")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "cargo" && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            {task.shipmentLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("tasks.noCargo")}</p>
            )}
            {task.shipmentLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between border-t border-border pt-3 text-sm first:border-t-0 first:pt-0"
              >
                <span className="text-foreground">
                  {link.shipment.quantity}× {t(`shipmentType.${link.shipment.type}`)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {link.shipment.weightKg ? `${link.shipment.weightKg} kg` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === "dependencies" && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">
            <form onSubmit={handleAddDependency} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Select
                value={depTaskId}
                onChange={(e) => setDepTaskId(e.target.value)}
                required
                className="sm:col-span-2"
              >
                <option value="" disabled>
                  {t("tasks.selectRelatedTask")}
                </option>
                {otherTasks
                  .filter((t2) => t2.id !== task.id)
                  .map((t2) => (
                    <option key={t2.id} value={t2.id}>
                      {t2.taskNumber}
                    </option>
                  ))}
              </Select>
              <Select value={depDirection} onChange={(e) => setDepDirection(e.target.value as typeof depDirection)}>
                <option value="predecessor">{t("tasks.dependsOn")}</option>
                <option value="successor">{t("tasks.blockedByThis")}</option>
              </Select>
              <Select value={depType} onChange={(e) => setDepType(e.target.value as DependencyType)}>
                {DEPENDENCY_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {t(`dependencyType.${dt}`)}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" className="sm:col-span-4 w-fit">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                {t("tasks.addDependency")}
              </Button>
            </form>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("tasks.dependsOn")}
              </p>
              {(dependencies?.asSuccessor.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">{t("tasks.noDependencies")}</p>
              )}
              {dependencies?.asSuccessor.map((edge) => (
                <div key={edge.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">
                    {edge.predecessorTask?.taskNumber} ({t(`dependencyType.${edge.type}`)})
                  </span>
                  <button onClick={() => handleRemoveDependency(edge.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {t("tasks.blockedByThis")}
              </p>
              {(dependencies?.asPredecessor.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">{t("tasks.noDependencies")}</p>
              )}
              {dependencies?.asPredecessor.map((edge) => (
                <div key={edge.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono">
                    {edge.successorTask?.taskNumber} ({t(`dependencyType.${edge.type}`)})
                  </span>
                  <button onClick={() => handleRemoveDependency(edge.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "activity" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.proof")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {task.proofs.length === 0 && <p className="text-sm text-muted-foreground">{t("tasks.noProof")}</p>}
              {task.proofs.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {t(`proofType.${p.type}`)}
                  </span>
                  <span className="text-foreground">{p.textValue ?? p.fileUrl ?? p.numericValue ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.exceptions")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {task.exceptions.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("tasks.noExceptions")}</p>
              )}
              {task.exceptions.map((exc) => (
                <div key={exc.id} className="flex flex-col gap-1 border-t border-border pt-2 text-sm first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{t(`exceptionType.${exc.type}`)}</span>
                    <span className="font-mono text-xs uppercase text-muted-foreground">
                      {t(`exceptionStatus.${exc.status}`)}
                    </span>
                  </div>
                  {exc.description && <p className="text-muted-foreground">{exc.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tasks.statusHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-6 pl-1">
                {task.statusHistory.map((entry, i) => (
                  <li key={entry.id} className="relative flex gap-4 pl-6">
                    {i < task.statusHistory.length - 1 && (
                      <span className="absolute left-[5px] top-3 h-[calc(100%+12px)] w-px bg-border" />
                    )}
                    <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-card" />
                    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      <TaskStatusStamp status={entry.status} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(entry.changedAt).toLocaleString()}
                      </span>
                      {entry.changedBy && (
                        <span className="text-xs text-muted-foreground">
                          {entry.changedBy.firstName} {entry.changedBy.lastName}
                        </span>
                      )}
                      {entry.note && <span className="text-sm text-foreground">{entry.note}</span>}
                      {entry.isOverride && (
                        <span className="text-xs text-destructive">{t("tasks.overridden")}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialog === "assign"} onOpenChange={closeDialog} title={t("tasks.assign")}>
        <form onSubmit={handleAssignSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("tasks.driver")}</Label>
            <Select value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
              <option value="">{t("tasks.selectDriver")}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("tasks.vehicle")}</Label>
            <Select value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)}>
              <option value="">{t("tasks.selectVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={assignOverride} onChange={(e) => setAssignOverride(e.target.checked)} />
            {t("tasks.overrideWarnings")}
          </label>
          {assignOverride && (
            <Input
              value={assignOverrideReason}
              onChange={(e) => setAssignOverrideReason(e.target.value)}
              placeholder={t("tasks.overrideReasonPlaceholder")}
              required
            />
          )}
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.assign")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={dialog === "cancel"} onOpenChange={closeDialog} title={t("tasks.cancelTask")}>
        <form onSubmit={handleCancelSubmit} className="flex flex-col gap-3">
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("tasks.cancelReasonPlaceholder")}
            required
          />
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" variant="destructive" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.cancelTask")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={dialog === "reschedule"} onOpenChange={closeDialog} title={t("tasks.reschedule")}>
        <form onSubmit={handleRescheduleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("tasks.newScheduledDate")}</Label>
            <Input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </div>
          <Input
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            placeholder={t("tasks.rescheduleReasonPlaceholder")}
            required
          />
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.reschedule")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={dialog === "fail"} onOpenChange={closeDialog} title={t("tasks.markFailed")}>
        <form onSubmit={handleFailSubmit} className="flex flex-col gap-3">
          <Select value={failType} onChange={(e) => setFailType(e.target.value as ExceptionType)}>
            {EXCEPTION_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(`exceptionType.${et}`)}
              </option>
            ))}
          </Select>
          <Input
            value={failNote}
            onChange={(e) => setFailNote(e.target.value)}
            placeholder={t("tasks.failNotePlaceholder")}
          />
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" variant="destructive" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.markFailed")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={dialog === "complete"} onOpenChange={closeDialog} title={t("tasks.complete")}>
        <form onSubmit={handleCompleteSubmit} className="flex flex-col gap-3">
          {task.taskType.requiredProofTypes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("tasks.requiredProof")}: {task.taskType.requiredProofTypes.map((pt) => t(`proofType.${pt}`)).join(", ")}
            </p>
          )}
          <Select value={completeProofType} onChange={(e) => setCompleteProofType(e.target.value as ProofType)}>
            {PROOF_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {t(`proofType.${pt}`)}
              </option>
            ))}
          </Select>
          <Input
            value={completeProofValue}
            onChange={(e) => setCompleteProofValue(e.target.value)}
            placeholder={t("tasks.proofValuePlaceholder")}
          />
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.complete")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={dialog === "partial"} onOpenChange={closeDialog} title={t("tasks.markPartial")}>
        <form onSubmit={handlePartialSubmit} className="flex flex-col gap-3">
          <Input
            value={partialNote}
            onChange={(e) => setPartialNote(e.target.value)}
            placeholder={t("tasks.partialNotePlaceholder")}
            required
          />
          {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
          <Button type="submit" size="sm" disabled={isDialogSaving}>
            {isDialogSaving ? t("common.saving") : t("tasks.markPartial")}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
