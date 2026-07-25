import * as React from "react";
import { useNavigate } from "react-router-dom";
import * as customersApi from "@/api/customers.api";
import type { Customer } from "@/api/customers.api";
import * as ordersApi from "@/api/orders.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OrderCreatePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerId, setCustomerId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [originAddress, setOriginAddress] = React.useState("");
  const [destAddress, setDestAddress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    customersApi.listCustomers({ limit: 100 }).then((res) => setCustomers(res.items));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await ordersApi.createOrder({
        customerId,
        description: description || undefined,
        originAddress: originAddress || undefined,
        destAddress: destAddress || undefined,
      });
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">New order</h1>

      <Card>
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer">Customer</Label>
              <Select
                id="customer"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="" disabled>
                  Select a customer…
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cargo / item description"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="origin">Origin address</Label>
              <Input
                id="origin"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dest">Destination address</Label>
              <Input id="dest" value={destAddress} onChange={(e) => setDestAddress(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isSubmitting || !customerId}>
              {isSubmitting ? "Creating…" : "Create order"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
