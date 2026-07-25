import type { ServiceOrderStatus } from "@loopice/shared";
import { cn } from "@/lib/utils";

// The signature element: SO status renders as an ink stamp, the way a
// waybill or manifest actually gets marked as it moves through a depot.
// Semantic per-status ink color, not tenant-branded -- status is a fact
// about the service order, not a place for whitelabel identity.

// Flat border+text ink per status, reused by interactive controls (e.g. the
// status filter chips) that shouldn't carry the stamp's rotation or fill --
// tilt reads as "a mark that was made," not as a live control.
export const STATUS_INK: Record<ServiceOrderStatus, string> = {
  DRAFT: "border-foreground/50 text-foreground/70",
  QUOTED: "border-sky-700 text-sky-700",
  CONFIRMED: "border-blue-700 text-blue-700",
  PLANNED: "border-violet-700 text-violet-700",
  IN_PROGRESS: "border-amber-700 text-amber-700",
  COMPLETED: "border-emerald-700 text-emerald-700",
  BILLED: "border-teal-700 text-teal-700",
  CLOSED: "border-slate-700 text-slate-700",
  CANCELLED: "border-red-700 text-red-700",
};

const STAMP_STYLES: Record<ServiceOrderStatus, string> = {
  DRAFT: "text-foreground/55 ring-foreground/25 bg-foreground/[0.03]",
  QUOTED: "text-sky-700 ring-sky-700/45 bg-sky-700/5",
  CONFIRMED: "text-blue-700 ring-blue-700/45 bg-blue-700/5",
  PLANNED: "text-violet-700 ring-violet-700/45 bg-violet-700/5",
  IN_PROGRESS: "text-amber-700 ring-amber-700/45 bg-amber-700/5",
  COMPLETED: "text-emerald-700 ring-emerald-700/45 bg-emerald-700/5",
  BILLED: "text-teal-700 ring-teal-700/45 bg-teal-700/5",
  CLOSED: "text-slate-700 ring-slate-700/45 bg-slate-700/5",
  CANCELLED: "text-red-700 ring-red-700/45 bg-red-700/5",
};

const STAMP_ROTATION: Record<ServiceOrderStatus, string> = {
  DRAFT: "-rotate-1",
  QUOTED: "rotate-1",
  CONFIRMED: "-rotate-1",
  PLANNED: "rotate-1",
  IN_PROGRESS: "-rotate-1",
  COMPLETED: "rotate-1",
  BILLED: "-rotate-1",
  CLOSED: "rotate-1",
  CANCELLED: "-rotate-2",
};

export function StatusStamp({
  status,
  className,
  ringOffset = "ring-offset-card",
}: {
  status: ServiceOrderStatus;
  className?: string;
  ringOffset?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm border-2 border-current px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest ring-1 ring-offset-2",
        STAMP_STYLES[status],
        STAMP_ROTATION[status],
        ringOffset,
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
