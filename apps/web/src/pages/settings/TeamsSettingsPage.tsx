import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Team } from "@/api/teams.api";
import * as teamsApi from "@/api/teams.api";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TeamsSettingsPage() {
  const { t } = useTranslation();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setTeams(await teamsApi.listTeams());
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await teamsApi.createTeam({ name: form.name, description: form.description || undefined });
      setForm({ name: "", description: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.teams.failedToCreate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await teamsApi.deactivateTeam(id);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("settings.teams.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("settings.teams.title")}
          </h1>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            t("common.cancel")
          ) : (
            <>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {t("settings.teams.newTeam")}
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder={t("settings.teams.namePlaceholder")}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                placeholder={t("settings.teams.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="sm:col-span-2">
                {isSubmitting ? t("common.saving") : t("settings.teams.createTeam")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.teams.colName")}</TableHead>
              <TableHead>{t("settings.teams.colMembers")}</TableHead>
              <TableHead>{t("settings.teams.colStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium text-foreground">{team.name}</TableCell>
                <TableCell className="text-muted-foreground">{team.members.length}</TableCell>
                <TableCell>
                  <Badge variant={team.isActive ? "success" : "secondary"}>
                    {team.isActive ? t("settings.teams.active") : t("settings.teams.deactivated")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {team.isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleDeactivate(team.id)}>
                      {t("settings.teams.deactivate")}
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
