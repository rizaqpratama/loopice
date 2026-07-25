import * as React from "react";
import { Link } from "react-router-dom";
import type { OrderStatus } from "@loopice/shared";
import { ORDER_STATUSES } from "@loopice/shared";
import * as customersApi from "@/api/customers.api";
import * as ordersApi from "@/api/orders.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalCustomers ?? "…"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalOrders ?? "…"}</p>
          </CardContent>
        </Card>
        {ORDER_STATUSES.map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle>{status.replace("_", " ")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                {statusCounts ? statusCounts[status] : "…"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Link to="/orders/new" className="text-sm font-medium text-brand-primary hover:underline">
          + Create order
        </Link>
        <Link to="/customers" className="text-sm font-medium text-brand-primary hover:underline">
          View customers
        </Link>
      </div>
    </div>
  );
}
