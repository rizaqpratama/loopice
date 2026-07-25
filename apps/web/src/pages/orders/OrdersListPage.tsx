import * as React from "react";
import { Link } from "react-router-dom";
import type { OrderStatus } from "@loopice/shared";
import { ORDER_STATUSES } from "@loopice/shared";
import * as ordersApi from "@/api/orders.api";
import type { Order } from "@/api/orders.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "./statusBadge";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
        <Link to="/orders/new">
          <Button>+ New order</Button>
        </Link>
      </div>

      <Select
        className="max-w-xs"
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus | "")}
      >
        <option value="">All statuses</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </Select>

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
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-medium text-brand-primary hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.customer.name}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
