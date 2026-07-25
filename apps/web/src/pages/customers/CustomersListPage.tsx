import * as React from "react";
import { Link } from "react-router-dom";
import * as customersApi from "@/api/customers.api";
import type { Customer } from "@/api/customers.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CustomersListPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", address: "" });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async (search?: string) => {
    setIsLoading(true);
    const res = await customersApi.listCustomers({ search, limit: 50 });
    setCustomers(res.items);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await load(search || undefined);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await customersApi.createCustomer({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
      setForm({ name: "", email: "", phone: "", address: "" });
      setShowForm(false);
      await load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ New customer"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
                {isSubmitting ? "Saving…" : "Save customer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSearchSubmit} className="flex max-w-sm gap-2">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
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
            {!isLoading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No customers yet.
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    to={`/customers/${customer.id}`}
                    className="font-medium text-brand-primary hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>{customer.email ?? "—"}</TableCell>
                <TableCell>{customer.phone ?? "—"}</TableCell>
                <TableCell>{customer.address ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
