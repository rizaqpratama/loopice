import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TaskTypeConfig } from "@/api/taskTypes.api";
import * as taskTypesApi from "@/api/taskTypes.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TaskTypesSettingsPage() {
  const { t } = useTranslation();
  const [taskTypes, setTaskTypes] = React.useState<TaskTypeConfig[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ code: "", name: "", category: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setTaskTypes(await taskTypesApi.listTaskTypes());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await taskTypesApi.createTaskType({ code: form.code, name: form.name, category: form.category });
      setForm({ code: "", name: "", category: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.taskTypes.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await taskTypesApi.deactivateTaskType(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.taskTypes.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.taskTypes.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.taskTypes.newTaskType")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                placeholder={t("settings.taskTypes.codePlaceholder")}
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <Input
                placeholder={t("settings.taskTypes.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("settings.taskTypes.categoryPlaceholder")}
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-3">
                {isSubmitting ? t("common.saving") : t("settings.taskTypes.createTaskType")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.taskTypes.colCode")}</TableHead>
              <TableHead>{t("settings.taskTypes.colName")}</TableHead>
              <TableHead>{t("settings.taskTypes.colCategory")}</TableHead>
              <TableHead>{t("settings.taskTypes.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taskTypes.map((tt) => (
              <TableRow key={tt.id}>
                <TableCell className="font-mono text-xs font-medium text-foreground">{tt.code}</TableCell>
                <TableCell className="font-medium text-foreground">{tt.name}</TableCell>
                <TableCell className="text-muted-foreground">{tt.category}</TableCell>
                <TableCell>
                  <Badge variant={tt.isActive ? "success" : "secondary"}>
                    {tt.isActive ? t("settings.taskTypes.active") : t("settings.taskTypes.deactivated")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tt.isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(tt.id)}>
                      {t("settings.taskTypes.deactivate")}
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
