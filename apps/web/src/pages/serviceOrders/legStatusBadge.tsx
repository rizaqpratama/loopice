import type { ShipmentLegStatus } from "@loopice/shared";
import { Stamp } from "@/components/status/Stamp";

const STAMP_STYLES: Record<ShipmentLegStatus, string> = {
  PLANNED: "text-violet-700 ring-violet-700/45 bg-violet-700/5",
  IN_TRANSIT: "text-amber-700 ring-amber-700/45 bg-amber-700/5",
  ARRIVED: "text-emerald-700 ring-emerald-700/45 bg-emerald-700/5",
  CANCELLED: "text-red-700 ring-red-700/45 bg-red-700/5",
};

const STAMP_ROTATION: Record<ShipmentLegStatus, string> = {
  PLANNED: "rotate-1",
  IN_TRANSIT: "-rotate-1",
  ARRIVED: "rotate-1",
  CANCELLED: "-rotate-2",
};

export function LegStatusStamp({
  status,
  className,
  ringOffset = "ring-offset-card",
}: {
  status: ShipmentLegStatus;
  className?: string;
  ringOffset?: string;
}) {
  return (
    <Stamp
      status={status}
      stampStyles={STAMP_STYLES}
      stampRotation={STAMP_ROTATION}
      i18nPrefix="shipmentLegStatus"
      className={className}
      ringOffset={ringOffset}
    />
  );
}
