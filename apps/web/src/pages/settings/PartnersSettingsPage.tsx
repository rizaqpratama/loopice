import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Partner } from "@/api/partners.api";
import * as partnersApi from "@/api/partners.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PartnersSettingsPage() {
  const { t } = useTranslation();
  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", type: "", contactPhone: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setPartners(await partnersApi.listPartners());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await partnersApi.createPartner({
        name: form.name,
        type: form.type || undefined,
        contactPhone: form.contactPhone || undefined,
      });
      setForm({ name: "", type: "", contactPhone: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.partners.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await partnersApi.deactivatePartner(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.partners.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.partners.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.partners.newPartner")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder={t("settings.partners.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("settings.partners.typePlaceholder")}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
              <Input
                placeholder={t("settings.partners.phonePlaceholder")}
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-3">
                {isSubmitting ? t("common.saving") : t("settings.partners.createPartner")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.partners.colName")}</TableHead>
              <TableHead>{t("settings.partners.colType")}</TableHead>
              <TableHead>{t("settings.partners.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium text-foreground">{partner.name}</TableCell>
                <TableCell className="text-muted-foreground">{partner.type ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={partner.isActive ? "success" : "secondary"}>
                    {partner.isActive ? t("settings.partners.active") : t("settings.partners.deactivated")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {partner.isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(partner.id)}>
                      {t("settings.partners.deactivate")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
