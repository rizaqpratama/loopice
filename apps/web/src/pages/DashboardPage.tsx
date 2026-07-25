import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Plus, Users } from "lucide-react";
import type { ServiceOrderStatus } from "@loopice/shared";
import { SERVICE_ORDER_STATUSES } from "@loopice/shared";
import * as customersApi from "@/api/customers.api";
import * as serviceOrdersApi from "@/api/serviceOrders.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// "Open" work -- not yet finished, billed, closed out, or cancelled.
const OPEN_STATUSES: ServiceOrderStatus[] = [
  "DRAFT",
  "QUOTED",
  "CONFIRMED",
  "PLANNED",
  "IN_PROGRESS",
];

const LEDGER_ROWS: { label: string; status: ServiceOrderStatus }[] = SERVICE_ORDER_STATUSES.map(
  (status) => ({ label: status.replace("_", " "), status })
);

export function DashboardPage() {
  const navigate = useNavigate();
  const [totalCustomers, setTotalCustomers] = React.useState<number | null>(null);
  const [statusCounts, setStatusCounts] = React.useState<Record<ServiceOrderStatus, number> | null>(
    null
  );
  const [totalServiceOrders, setTotalServiceOrders] = React.useState<number | null>(null);
  const [totalShipmentUnits, setTotalShipmentUnits] = React.useState<number | null>(null);

  React.useEffect(() => {
    customersApi.listCustomers({ limit: 1 }).then((res) => setTotalCustomers(res.total));

    serviceOrdersApi.listServiceOrders({ limit: 100 }).then((res) => {
      setTotalServiceOrders(res.total);
      const counts = Object.fromEntries(SERVICE_ORDER_STATUSES.map((s) => [s, 0])) as Record<
        ServiceOrderStatus,
        number
      >;
      let shipmentUnits = 0;
      for (const so of res.items) {
        counts[so.status]++;
        for (const shipment of so.shipments) shipmentUnits += shipment.quantity;
      }
      setStatusCounts(counts);
      setTotalShipmentUnits(shipmentUnits);
    });
  }, []);

  const openCount = statusCounts
    ? OPEN_STATUSES.reduce((sum, s) => sum + statusCounts[s], 0)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Dispatch board
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Today's manifest
          </h1>
        </div>
        <Button onClick={() => navigate("/service-orders/new")}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New service order
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Featured stat -- the one number a dispatcher actually needs right now. */}
        <div className="flex flex-col justify-between rounded-md bg-foreground p-6 text-background lg:col-span-2">
          <div className="flex items-center gap-2 opacity-70">
            <Boxes className="h-4 w-4" strokeWidth={2} />
            <p className="font-mono text-xs uppercase tracking-[0.15em]">Open service orders</p>
          </div>
          <p className="font-display text-6xl font-semibold tabular-nums">{openCount ?? "—"}</p>
          <p className="text-sm opacity-70">
            of {totalServiceOrders ?? "…"} total, not yet completed, billed, closed, or cancelled
          </p>
        </div>

        {/* Ledger of every status, plus cargo units and customer count as reference. */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Service order ledger
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {totalServiceOrders ?? "…"} total
            </p>
          </div>
          <div className="divide-y divide-border">
            {LEDGER_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm capitalize text-foreground">{row.label.toLowerCase()}</span>
                <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                  {statusCounts ? statusCounts[row.status] : "…"}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Boxes className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                Cargo units (pallets/containers/parcels)
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                {totalShipmentUnits ?? "…"}
              </span>
            </div>
            <button
              onClick={() => navigate("/customers")}
              className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-2 text-sm text-brand-primary">
                <Users className="h-3.5 w-3.5" strokeWidth={2} />
                Customers on file
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                {totalCustomers ?? "…"}
              </span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
