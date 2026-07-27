import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/api/client";

export function FacilityReceivingPage() {
  const { t } = useTranslation();
  const [selectedReconciliation, setSelectedReconciliation] = useState<string | null>(null);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest<any[]>("/receiving-reconciliation", {
      params: { skip: 0, take: 50 },
    })
      .then(setReconciliations)
      .catch(() => setReconciliations([]))
      .finally(() => setLoading(false));
  }, []);

  const activeReconciliations = reconciliations.filter(
    (r: any) => r.status === "PENDING" || r.status === "IN_PROGRESS"
  );

  const selectedItem = reconciliations.find((r: any) => r.id === selectedReconciliation);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("facilityReceiving.title")}</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Queue */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("facilityReceiving.queue")}</h2>
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : activeReconciliations.length === 0 ? (
            <p className="text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-2">
              {activeReconciliations.map((rec: any) => (
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
                    <span className="font-mono text-sm">{rec.manifest?.manifestNumber}</span>
                    <span className="text-xs font-mono uppercase">{rec.status}</span>
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
          {selectedItem ? (
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-semibold">Manifest:</span>
                  {" "}
                  {selectedItem.manifest?.manifestNumber}
                </div>
                <div>
                  <span className="font-semibold">Items Received:</span>
                  {" "}
                  {selectedItem.receivedItemCount || 0} / {selectedItem.expectedItemCount}
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
