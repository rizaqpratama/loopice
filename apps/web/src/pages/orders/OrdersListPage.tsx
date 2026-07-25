import * as React from "react";
import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import type { OrderStatus } from "@loopice/shared";
import { ORDER_STATUSES } from "@loopice/shared";
import * as ordersApi from "@/api/orders.api";
import type { Order } from "@/api/orders.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_INK, StatusStamp } from "./statusBadge";

export function OrdersListPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [status, setStatus] = React.useState<OrderStatus | "">("");
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async (status?: OrderStatus) => {
    setIsLoading(true);
    const res = await ordersApi.listOrders({ status, limit: 50 });
    setOrders(res.items);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    load(status || undefined);
  }, [load, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Order ledger
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Orders
          </h1>
        </div>
        <Link to="/orders/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New order
          </Button>
        </Link>
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
          All
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
              status === s ? STATUS_INK[s] : "border-border text-muted-foreground hover:border-foreground/40"
            )}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Package className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">No orders found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-mono text-sm font-medium text-foreground hover:text-brand-primary"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.customer.name}</TableCell>
                <TableCell>
                  <StatusStamp status={order.status} ringOffset="ring-offset-card" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
