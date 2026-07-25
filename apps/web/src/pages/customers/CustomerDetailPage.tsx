import * as React from "react";
import { Link, useParams } from "react-router-dom";
import * as customersApi from "@/api/customers.api";
import type { CustomerWithOrders } from "@/api/customers.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = React.useState<CustomerWithOrders | null>(null);

  React.useEffect(() => {
    if (id) customersApi.getCustomer(id).then(setCustomer);
  }, [id]);

  if (!customer) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">{customer.name}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-foreground">
            <p>Email: {customer.email ?? "—"}</p>
            <p>Phone: {customer.phone ?? "—"}</p>
            <p>Address: {customer.address ?? "—"}</p>
            {customer.notes && <p>Notes: {customer.notes}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders ({customer.orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {customer.orders.length === 0 && (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
          {customer.orders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted"
            >
              <span className="font-medium text-foreground">{order.orderNumber}</span>
              <Badge variant="secondary">{order.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
