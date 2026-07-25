import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Truck, Users } from "lucide-react";
import type { OrderStatus } from "@loopice/shared";
import { ORDER_STATUSES } from "@loopice/shared";
import * as customersApi from "@/api/customers.api";
import * as ordersApi from "@/api/orders.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ACTIVE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "IN_TRANSIT"];

const LEDGER_ROWS: { label: string; status?: OrderStatus }[] = [
  { label: "Pending", status: "PENDING" },
  { label: "Confirmed", status: "CONFIRMED" },
  { label: "In transit", status: "IN_TRANSIT" },
  { label: "Delivered", status: "DELIVERED" },
  { label: "Cancelled", status: "CANCELLED" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [totalCustomers, setTotalCustomers] = React.useState<number | null>(null);
  const [statusCounts, setStatusCounts] = React.useState<Record<OrderStatus, number> | null>(null);
  const [totalOrders, setTotalOrders] = React.useState<number | null>(null);

  React.useEffect(() => {
    customersApi.listCustomers({ limit: 1 }).then((res) => setTotalCustomers(res.total));

    ordersApi.listOrders({ limit: 100 }).then((res) => {
      setTotalOrders(res.total);
      const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
        OrderStatus,
        number
      >;
      for (const order of res.items) counts[order.status]++;
      setStatusCounts(counts);
    });
  }, []);

  const activeCount = statusCounts
    ? ACTIVE_STATUSES.reduce((sum, s) => sum + statusCounts[s], 0)
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
        <Button onClick={() => navigate("/orders/new")}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create order
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Featured stat -- the one number a dispatcher actually needs right now. */}
        <div className="flex flex-col justify-between rounded-md bg-foreground p-6 text-background lg:col-span-2">
          <div className="flex items-center gap-2 opacity-70">
            <Truck className="h-4 w-4" strokeWidth={2} />
            <p className="font-mono text-xs uppercase tracking-[0.15em]">Active shipments</p>
          </div>
          <p className="font-display text-6xl font-semibold tabular-nums">
            {activeCount ?? "—"}
          </p>
          <p className="text-sm opacity-70">
            of {totalOrders ?? "…"} total orders currently moving through the network
          </p>
        </div>

        {/* Ledger of every status, plus customer count as reference. */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Order ledger
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {totalOrders ?? "…"} total
            </p>
          </div>
          <div className="divide-y divide-border">
            {LEDGER_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-foreground">{row.label}</span>
                <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                  {statusCounts && row.status ? statusCounts[row.status] : "…"}
                </span>
              </div>
            ))}
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
