import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import * as customersApi from "@/api/customers.api";
import type { CustomerWithServiceOrders } from "@/api/customers.api";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusStamp } from "@/pages/serviceOrders/statusBadge";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = React.useState<CustomerWithServiceOrders | null>(null);

  React.useEffect(() => {
    if (id) customersApi.getCustomer(id).then(setCustomer);
  }, [id]);

  if (!customer) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Customers
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={customer.name} size="lg" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {customer.name}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact info</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            {customer.email ?? "—"}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="font-mono">{customer.phone ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
            {customer.address ?? "—"}
          </div>
          {customer.notes && (
            <p className="mt-1 border-t border-border pt-2.5 text-sm text-muted-foreground">
              {customer.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Service Orders
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {customer.serviceOrders.length} total
          </p>
        </div>
        {customer.serviceOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No service orders yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {customer.serviceOrders.map((so) => (
              <Link
                key={so.id}
                to={`/service-orders/${so.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted"
              >
                <span className="font-mono text-sm font-medium text-foreground">
                  {so.soNumber}
                </span>
                <StatusStamp status={so.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
