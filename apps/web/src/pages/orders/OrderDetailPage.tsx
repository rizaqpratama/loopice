import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@loopice/shared";
import * as ordersApi from "@/api/orders.api";
import type { Order } from "@/api/orders.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "./statusBadge";

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{order.orderNumber}</h1>
          <Link to={`/customers/${order.customerId}`} className="text-sm text-brand-primary hover:underline">
            {order.customer.name}
          </Link>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-foreground">
            <p>Description: {order.description ?? "—"}</p>
            <p>Origin: {order.originAddress ?? "—"}</p>
            <p>Destination: {order.destAddress ?? "—"}</p>
            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
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
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "CANCELLED" ? "destructive" : "default"}
                  disabled={transitioning !== null}
                  onClick={() => handleTransition(status)}
                >
                  {transitioning === status ? "Updating…" : `Mark ${status.replace("_", " ")}`}
                </Button>
              ))}
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
          <ol className="flex flex-col gap-3">
            {order.statusHistory.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 text-sm">
                <OrderStatusBadge status={entry.status} />
                <span className="text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString()}
                </span>
                {entry.note && <span className="text-foreground">{entry.note}</span>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
