import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as customersApi from "@/api/customers.api";
import type { Customer } from "@/api/customers.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CustomersListPage() {
  const { t } = useTranslation();
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
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("customers.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("customers.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {t("customers.newCustomer")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder={t("customers.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("customers.emailPlaceholder")}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder={t("customers.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder={t("customers.addressPlaceholder")}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
                {isSubmitting ? t("common.saving") : t("customers.saveCustomer")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSearchSubmit} className="flex max-w-sm gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          {t("common.search")}
        </Button>
      </form>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("customers.colName")}</TableHead>
              <TableHead>{t("customers.colEmail")}</TableHead>
              <TableHead>{t("customers.colPhone")}</TableHead>
              <TableHead>{t("customers.colAddress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">{t("customers.emptyState")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    to={`/customers/${customer.id}`}
                    className="flex items-center gap-2.5 font-medium text-foreground hover:text-brand-primary"
                  >
                    <Avatar name={customer.name} size="sm" />
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {customer.phone ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.address ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
