import * as React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as tasksApi from "@/api/tasks.api";
import type { Task } from "@/api/tasks.api";
import * as driversApi from "@/api/drivers.api";
import type { Driver } from "@/api/drivers.api";
import * as routePlansApi from "@/api/routePlans.api";
import { ApiError } from "@/api/client";
import { Card } from "@/components/ui/card";
import { TaskStatusStamp } from "@/pages/tasks/taskStatusBadge";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = ["ASSIGNED", "PLANNED", "READY", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] as const;
const UNASSIGNED_LANE = "unassigned";

function windowsOverlap(a: Task, b: Task): boolean {
  if (!a.timeWindowStart || !a.timeWindowEnd || !b.timeWindowStart || !b.timeWindowEnd) return false;
  return (
    new Date(a.timeWindowStart) < new Date(b.timeWindowEnd) &&
    new Date(a.timeWindowEnd) > new Date(b.timeWindowStart)
  );
}

function TaskCard({ task, conflict, dragHandle }: { task: Task; conflict: boolean; dragHandle?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-sm border border-border bg-card p-2.5 text-sm shadow-sm",
        dragHandle && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/tasks/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-xs font-medium text-foreground hover:text-brand-primary"
        >
          {task.taskNumber}
        </Link>
        {conflict && (
          <span title={t("dispatchBoard.timeConflict")}>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{task.taskType.name}</p>
      <TaskStatusStamp status={task.status} className="scale-90 self-start" />
    </div>
  );
}

function SortableTaskCard({ task, conflict }: { task: Task; conflict: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} conflict={conflict} dragHandle />
    </div>
  );
}

function UnassignedTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} conflict={false} dragHandle />
    </div>
  );
}

function Lane({
  id,
  title,
  tasks,
  sortable,
  children,
}: {
  id: string;
  title: string;
  tasks: Task[];
  sortable?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const content = sortable ? (
    <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  ) : (
    children
  );
  return (
    <Card
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 p-3 transition-colors",
        isOver && "border-brand-primary bg-brand-primary/5"
      )}
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title} ({tasks.length})
      </p>
      <div ref={setNodeRef} className="flex min-h-[3rem] flex-col gap-2">
        {content}
      </div>
    </Card>
  );
}

export function DispatchBoardPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = React.useCallback(async () => {
    const [driversRes, unassignedRes, activeRes] = await Promise.all([
      driversApi.listDrivers({ status: "ACTIVE" }),
      tasksApi.listTasks({ status: ["UNASSIGNED"], limit: 100 }),
      tasksApi.listTasks({ status: [...ACTIVE_STATUSES], limit: 100 }),
    ]);
    setDrivers(driversRes);
    setTasks([...unassignedRes.items, ...activeRes.items]);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const unassignedTasks = tasks.filter((t) => t.status === "UNASSIGNED" && !t.assignedDriverId);
  const laneForDriver = (driverId: string) =>
    tasks.filter((t) => t.assignedDriverId === driverId && (ACTIVE_STATUSES as readonly string[]).includes(t.status));

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const overId = String(over.id);

    if (overId === UNASSIGNED_LANE) {
      if (task.status !== "ASSIGNED") return;
      try {
        await tasksApi.unassignTask(task.id, task.version);
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("dispatchBoard.failedToUnassign"));
        await load();
      }
      return;
    }

    // Dropped either directly on a driver lane, or on a task card that belongs to one
    // (the lane's droppable area is mostly covered by its own sortable task cards).
    const overTask = tasks.find((tsk) => tsk.id === overId);
    const targetDriverId = drivers.some((d) => d.id === overId) ? overId : overTask?.assignedDriverId;
    if (!targetDriverId) return;

    // Reorder within the same lane: both tasks already belong to this driver and share a route.
    if (
      overTask &&
      task.assignedDriverId === targetDriverId &&
      task.routeId &&
      overTask.routeId === task.routeId &&
      task.id !== overTask.id
    ) {
      const laneTasks = laneForDriver(targetDriverId).filter((tsk) => tsk.routeId === task.routeId);
      const oldIndex = laneTasks.findIndex((tsk) => tsk.id === task.id);
      const newIndex = laneTasks.findIndex((tsk) => tsk.id === overTask.id);
      const reordered = arrayMove(laneTasks, oldIndex, newIndex);
      try {
        await routePlansApi.reorderRouteTaskSequence(task.routeId, reordered.map((tsk) => tsk.id));
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("dispatchBoard.failedToReorder"));
        await load();
      }
      return;
    }

    // Otherwise: assign (or re-assign) the dragged task to the target driver's lane.
    if (task.assignedDriverId === targetDriverId) return;
    if (task.status !== "UNASSIGNED" && task.status !== "ASSIGNED") return;

    setError(null);
    try {
      await tasksApi.assignTask(task.id, { assignedDriverId: targetDriverId }, task.version);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dispatchBoard.failedToAssign"));
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {t("dispatchBoard.eyebrow")}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {t("dispatchBoard.title")}
        </h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Lane id={UNASSIGNED_LANE} title={t("dispatchBoard.unassigned")} tasks={unassignedTasks}>
            {unassignedTasks.map((tsk) => (
              <UnassignedTaskCard key={tsk.id} task={tsk} />
            ))}
            {unassignedTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("dispatchBoard.noUnassigned")}</p>
            )}
          </Lane>

          {drivers.map((driver) => {
            const laneTasks = laneForDriver(driver.id);
            return (
              <Lane key={driver.id} id={driver.id} title={driver.name} tasks={laneTasks} sortable>
                {laneTasks.map((tsk) => (
                  <SortableTaskCard
                    key={tsk.id}
                    task={tsk}
                    conflict={laneTasks.some((other) => other.id !== tsk.id && windowsOverlap(tsk, other))}
                  />
                ))}
                {laneTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("dispatchBoard.noTasks")}</p>
                )}
              </Lane>
            );
          })}
        </div>

        <DragOverlay>{activeTask && <TaskCard task={activeTask} conflict={false} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
