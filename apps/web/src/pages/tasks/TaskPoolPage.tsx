import * as React from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, UserPlus, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TASK_STATUSES, type TaskStatus } from "@loopice/shared";
import * as tasksApi from "@/api/tasks.api";
import type { Task } from "@/api/tasks.api";
import * as driversApi from "@/api/drivers.api";
import type { Driver } from "@/api/drivers.api";
import * as taskTypesApi from "@/api/taskTypes.api";
import type { TaskTypeConfig } from "@/api/taskTypes.api";
import { ApiError } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TaskStatusStamp } from "./taskStatusBadge";

export function TaskPoolPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [total, setTotal] = React.useState(0);
  const [status, setStatus] = React.useState<TaskStatus | "">("");
  const [taskTypeIds, setTaskTypeIds] = React.useState<string[]>([]);
  const [unassignedOnly, setUnassignedOnly] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [taskTypes, setTaskTypes] = React.useState<TaskTypeConfig[]>([]);

  const [showBulkAssign, setShowBulkAssign] = React.useState(false);
  const [bulkDriverId, setBulkDriverId] = React.useState("");
  const [bulkError, setBulkError] = React.useState<string | null>(null);
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    const res = await tasksApi.listTasks({
      status: status ? [status] : undefined,
      unassigned: unassignedOnly || undefined,
      search: search || undefined,
      limit: 100,
    });
    setTasks(res.items);
    setTotal(res.total);
    setSelected(new Set());
    setIsLoading(false);
  }, [status, unassignedOnly, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    driversApi.listDrivers().then(setDrivers);
    taskTypesApi.listTaskTypes().then(setTaskTypes);
  }, []);

  // Server-side filtering only supports one taskTypeId; the type filter is
  // a multi-select Combobox, so the extra narrowing happens client-side on
  // top of the already-fetched page.
  const visibleTasks = React.useMemo(
    () => (taskTypeIds.length === 0 ? tasks : tasks.filter((tsk) => taskTypeIds.includes(tsk.taskTypeId))),
    [tasks, taskTypeIds]
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === visibleTasks.length ? new Set() : new Set(visibleTasks.map((tsk) => tsk.id))
    );
  }

  async function handleBulkAssign(e: React.FormEvent) {
    e.preventDefault();
    setBulkError(null);
    setIsBulkSaving(true);
    try {
      await tasksApi.bulkAssignTasks(Array.from(selected), { assignedDriverId: bulkDriverId });
      setShowBulkAssign(false);
      setBulkDriverId("");
      await load();
    } catch (err) {
      setBulkError(err instanceof ApiError ? err.message : t("tasks.failedToBulkAssign"));
    } finally {
      setIsBulkSaving(false);
    }
  }

  async function handleBulkCancel() {
    await tasksApi.bulkUpdateStatus(Array.from(selected), "CANCELLED", t("tasks.bulkCancelledNote"));
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("tasks.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("tasks.title")}
          </h1>
        </div>
        <Link to="/tasks/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t("tasks.newTask")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={t("tasks.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Combobox
          options={taskTypes.map((tt) => ({ value: tt.id, label: tt.name }))}
          selected={taskTypeIds}
          onChange={setTaskTypeIds}
          placeholder={t("tasks.filterByType")}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
          {t("tasks.unassignedOnly")}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatus("")}
          className={cn(
            "rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
            status === ""
              ? "border-foreground text-foreground"
              : "border-border text-muted-foreground hover:border-foreground/40"
          )}
        >
          {t("common.all")}
        </button>
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
              status === s
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40"
            )}
          >
            {t(`taskStatus.${s}`)}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <Card className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-foreground">{t("tasks.selectedCount", { count: selected.size })}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
              {t("tasks.bulkAssign")}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkCancel}>
              <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
              {t("tasks.bulkCancel")}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={visibleTasks.length > 0 && selected.size === visibleTasks.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>{t("tasks.colTaskNumber")}</TableHead>
              <TableHead>{t("tasks.colType")}</TableHead>
              <TableHead>{t("tasks.colCustomer")}</TableHead>
              <TableHead>{t("tasks.colScheduled")}</TableHead>
              <TableHead>{t("tasks.colPriority")}</TableHead>
              <TableHead>{t("tasks.colStatus")}</TableHead>
              <TableHead>{t("tasks.colDriver")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && visibleTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">{t("tasks.emptyState")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {visibleTasks.map((tsk) => (
              <TableRow key={tsk.id}>
                <TableCell>
                  <Checkbox checked={selected.has(tsk.id)} onChange={() => toggleSelected(tsk.id)} />
                </TableCell>
                <TableCell>
                  <Link
                    to={`/tasks/${tsk.id}`}
                    className="font-mono text-sm font-medium text-foreground hover:text-brand-primary"
                  >
                    {tsk.taskNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{tsk.taskType.name}</TableCell>
                <TableCell className="text-muted-foreground">{tsk.customer?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {tsk.scheduledDate ? new Date(tsk.scheduledDate).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t(`taskPriority.${tsk.priority}`)}
                </TableCell>
                <TableCell>
                  <TaskStatusStamp status={tsk.status} ringOffset="ring-offset-card" />
                </TableCell>
                <TableCell className="text-muted-foreground">{tsk.assignedDriver?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {visibleTasks.length > 0 && (
        <p className="font-mono text-xs text-muted-foreground">
          {t("tasks.showingCount", { count: visibleTasks.length, total })}
        </p>
      )}

      <Dialog
        open={showBulkAssign}
        onOpenChange={setShowBulkAssign}
        title={t("tasks.bulkAssign")}
        description={t("tasks.bulkAssignDescription", { count: selected.size })}
      >
        <form onSubmit={handleBulkAssign} className="flex flex-col gap-3">
          <Select value={bulkDriverId} onChange={(e) => setBulkDriverId(e.target.value)} required>
            <option value="" disabled>
              {t("tasks.selectDriver")}
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isBulkSaving}>
              {isBulkSaving ? t("common.saving") : t("tasks.bulkAssign")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowBulkAssign(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
