import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, type LucideIcon, PackageCheck, Truck, XCircle } from "lucide-react";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@loopice/shared";
import * as ordersApi from "@/api/orders.api";
import type { Order } from "@/api/orders.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusStamp } from "./statusBadge";

const TRANSITION_ICON: Record<OrderStatus, LucideIcon> = {
  PENDING: CheckCircle2,
  CONFIRMED: CheckCircle2,
  IN_TRANSIT: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [transitioning, setTransitioning] = React.useState<OrderStatus | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setOrder(await ordersApi.getOrder(id));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleTransition(status: OrderStatus) {
    if (!id) return;
    setError(null);
    setTransitioning(status);
    try {
      const updated = await ordersApi.updateOrderStatus(id, status);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setTransitioning(null);
    }
  }

  if (!order) return <p className="text-muted-foreground">Loading…</p>;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Orders
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Waybill
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              <span className="font-mono">{order.orderNumber}</span>
            </h1>
            <Link
              to={`/customers/${order.customerId}`}
              className="text-sm text-brand-primary hover:underline"
            >
              {order.customer.name}
            </Link>
          </div>
          <StatusStamp status={order.status} className="scale-125" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-foreground">
            <p>{order.description ?? "No description provided."}</p>
            <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2 text-muted-foreground">
              <p>
                <span className="text-foreground">Origin:</span> {order.originAddress ?? "—"}
              </p>
              <p>
                <span className="text-foreground">Destination:</span> {order.destAddress ?? "—"}
              </p>
              <p className="font-mono text-xs">
                Created {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transition status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {nextStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">No further transitions available.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => {
                const Icon = TRANSITION_ICON[status];
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === "CANCELLED" ? "destructive" : "default"}
                    disabled={transitioning !== null}
                    onClick={() => handleTransition(status)}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {transitioning === status ? "Updating…" : `Mark ${status.replace("_", " ")}`}
                  </Button>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-6 pl-1">
            {order.statusHistory.map((entry, i) => (
              <li key={entry.id} className="relative flex gap-4 pl-6">
                {i < order.statusHistory.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-[calc(100%+12px)] w-px bg-border" />
                )}
                <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-card" />
                <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusStamp status={entry.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(entry.changedAt).toLocaleString()}
                  </span>
                  {entry.note && <span className="text-sm text-foreground">{entry.note}</span>}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
