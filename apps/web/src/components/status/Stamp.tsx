import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Generic ink-stamp status indicator, extracted so any status enum (Service
// Order, Shipment Leg, ...) can render the same "marked as it moves through
// a depot" visual without duplicating the stamp markup per enum.
export function Stamp<TStatus extends string>({
  status,
  stampStyles,
  stampRotation,
  i18nPrefix,
  className,
  ringOffset = "ring-offset-card",
}: {
  status: TStatus;
  stampStyles: Record<TStatus, string>;
  stampRotation: Record<TStatus, string>;
  i18nPrefix: string;
  className?: string;
  ringOffset?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm border-2 border-current px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest ring-1 ring-offset-2",
        stampStyles[status],
        stampRotation[status],
        ringOffset,
        className
      )}
    >
      {t(`${i18nPrefix}.${status}`)}
    </span>
  );
}
