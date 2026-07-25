import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 border-b border-border", className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative px-3 py-2 font-display text-sm font-medium transition-colors",
              active ? "text-brand-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-primary" />}
          </button>
        );
      })}
    </div>
  );
}
