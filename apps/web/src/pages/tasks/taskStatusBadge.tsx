import type { TaskStatus } from "@loopice/shared";
import { Stamp } from "@/components/status/Stamp";

const STAMP_STYLES: Record<TaskStatus, string> = {
  DRAFT: "text-foreground/55 ring-foreground/25 bg-foreground/[0.03]",
  UNASSIGNED: "text-slate-700 ring-slate-700/45 bg-slate-700/5",
  ASSIGNED: "text-blue-700 ring-blue-700/45 bg-blue-700/5",
  PLANNED: "text-violet-700 ring-violet-700/45 bg-violet-700/5",
  READY: "text-cyan-700 ring-cyan-700/45 bg-cyan-700/5",
  EN_ROUTE: "text-amber-700 ring-amber-700/45 bg-amber-700/5",
  ARRIVED: "text-indigo-700 ring-indigo-700/45 bg-indigo-700/5",
  IN_PROGRESS: "text-amber-700 ring-amber-700/45 bg-amber-700/5",
  PARTIALLY_COMPLETED: "text-orange-700 ring-orange-700/45 bg-orange-700/5",
  COMPLETED: "text-emerald-700 ring-emerald-700/45 bg-emerald-700/5",
  FAILED: "text-red-700 ring-red-700/45 bg-red-700/5",
  RESCHEDULED: "text-purple-700 ring-purple-700/45 bg-purple-700/5",
  CANCELLED: "text-red-700 ring-red-700/45 bg-red-700/5",
};

const STAMP_ROTATION: Record<TaskStatus, string> = {
  DRAFT: "-rotate-1",
  UNASSIGNED: "rotate-1",
  ASSIGNED: "-rotate-1",
  PLANNED: "rotate-1",
  READY: "-rotate-1",
  EN_ROUTE: "rotate-1",
  ARRIVED: "-rotate-1",
  IN_PROGRESS: "rotate-1",
  PARTIALLY_COMPLETED: "-rotate-1",
  COMPLETED: "rotate-1",
  FAILED: "-rotate-2",
  RESCHEDULED: "rotate-1",
  CANCELLED: "-rotate-2",
};

export function TaskStatusStamp({
  status,
  className,
  ringOffset = "ring-offset-card",
}: {
  status: TaskStatus;
  className?: string;
  ringOffset?: string;
}) {
  return (
    <Stamp
      status={status}
      stampStyles={STAMP_STYLES}
      stampRotation={STAMP_ROTATION}
      i18nPrefix="taskStatus"
      className={className}
      ringOffset={ringOffset}
    />
  );
}
