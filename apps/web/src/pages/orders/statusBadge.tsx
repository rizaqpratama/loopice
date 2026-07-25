import type { OrderStatus } from "@loopice/shared";
import { cn } from "@/lib/utils";

// The signature element: order status rendered as an ink stamp, the way a
// waybill or manifest actually gets marked as it moves through a depot.
// Semantic per-status ink color, not tenant-branded -- status is a fact
// about the shipment, not a place for whitelabel identity.

// Flat border+text ink per status, reused by interactive controls (e.g. the
// status filter chips) that shouldn't carry the stamp's rotation or fill --
// tilt reads as "a mark that was made," not as a live control.
export const STATUS_INK: Record<OrderStatus, string> = {
  PENDING: "border-foreground/50 text-foreground/70",
  CONFIRMED: "border-blue-700 text-blue-700",
  IN_TRANSIT: "border-amber-700 text-amber-700",
  DELIVERED: "border-emerald-700 text-emerald-700",
  CANCELLED: "border-red-700 text-red-700",
};

const STAMP_STYLES: Record<OrderStatus, string> = {
  PENDING: "text-foreground/55 ring-foreground/25 bg-foreground/[0.03]",
  CONFIRMED: "text-blue-700 ring-blue-700/45 bg-blue-700/5",
  IN_TRANSIT: "text-amber-700 ring-amber-700/45 bg-amber-700/5",
  DELIVERED: "text-emerald-700 ring-emerald-700/45 bg-emerald-700/5",
  CANCELLED: "text-red-700 ring-red-700/45 bg-red-700/5",
};

const STAMP_ROTATION: Record<OrderStatus, string> = {
  PENDING: "-rotate-1",
  CONFIRMED: "rotate-1",
  IN_TRANSIT: "-rotate-1",
  DELIVERED: "rotate-1",
  CANCELLED: "-rotate-2",
};

export function StatusStamp({
  status,
  className,
  ringOffset = "ring-offset-card",
}: {
  status: OrderStatus;
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
