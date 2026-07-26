import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stamp } from "@/components/status/Stamp";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/api/client";

export function FacilityReceivingPage() {
  const { t } = useTranslation();
  const [selectedReconciliation, setSelectedReconciliation] = useState<string | null>(null);

  const { data: reconciliations = [] } = useQuery({
    queryKey: ["receiving-reconciliation"],
    queryFn: () =>
      apiRequest<any[]>("/receiving-reconciliation", {
        params: { skip: 0, take: 50 },
      }),
  });

  const activeReconciliations = reconciliations.filter(
    (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("facilityReceiving.title")}</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Queue */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("facilityReceiving.queue")}</h2>
          {activeReconciliations.length === 0 ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-2">
              {activeReconciliations.map((rec) => (
                <li
                  key={rec.id}
                  onClick={() => setSelectedReconciliation(rec.id)}
                  className={`p-3 rounded border cursor-pointer ${
                    selectedReconciliation === rec.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm">{rec.manifest.manifestNumber}</span>
                    <Stamp status={rec.status}>{t(`reconciliation.status.${rec.status}`)}</Stamp>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.expectedItemCount || 0} items expected
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Detail */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("facilityReceiving.detail")}</h2>
          {selectedReconciliation ? (
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-semibold">Manifest:</span>
                  {reconciliations.find((r) => r.id === selectedReconciliation)?.manifest
                    .manifestNumber}
                </div>
                <div>
                  <span className="font-semibold">Items Received:</span>
                  {reconciliations.find((r) => r.id === selectedReconciliation)?.receivedItemCount ||
                    0}{" "}
                  / {reconciliations.find((r) => r.id === selectedReconciliation)?.expectedItemCount}
                </div>
              </div>
              <Button className="w-full">{t("facilityReceiving.startReceiving")}</Button>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("common.selectItem")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
