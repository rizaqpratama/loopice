import * as React from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServiceOrderStatus } from "@loopice/shared";
import { SERVICE_ORDER_STATUSES } from "@loopice/shared";
import * as serviceOrdersApi from "@/api/serviceOrders.api";
import type { ServiceOrder } from "@/api/serviceOrders.api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_INK, StatusStamp } from "./statusBadge";

export function ServiceOrdersListPage() {
  const { t } = useTranslation();
  const [serviceOrders, setServiceOrders] = React.useState<ServiceOrder[]>([]);
  const [status, setStatus] = React.useState<ServiceOrderStatus | "">("");
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async (status?: ServiceOrderStatus) => {
    setIsLoading(true);
    const res = await serviceOrdersApi.listServiceOrders({ status, limit: 50 });
    setServiceOrders(res.items);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    load(status || undefined);
  }, [load, status]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
            {t("serviceOrders.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t("serviceOrders.title")}
          </h1>
        </div>
        <Link to="/service-orders/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t("serviceOrders.newServiceOrder")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatus("")}
          className={cn(
            "rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
            status === ""
              ? "border-foreground text-foreground"
              : "border-border text-muted-foreground hover:border-foreground/40"
          )}
        >
          {t("common.all")}
        </button>
        {SERVICE_ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-sm border-2 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
              status === s ? STATUS_INK[s] : "border-border text-muted-foreground hover:border-foreground/40"
            )}
          >
            {t(`status.${s}`)}
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("serviceOrders.colSoNumber")}</TableHead>
              <TableHead>{t("serviceOrders.colCustomer")}</TableHead>
              <TableHead>{t("serviceOrders.colShipments")}</TableHead>
              <TableHead>{t("serviceOrders.colStatus")}</TableHead>
              <TableHead>{t("serviceOrders.colCreated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && serviceOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">{t("serviceOrders.emptyState")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {serviceOrders.map((so) => (
              <TableRow key={so.id}>
                <TableCell>
                  <Link
                    to={`/service-orders/${so.id}`}
                    className="font-mono text-sm font-medium text-foreground hover:text-brand-primary"
                  >
                    {so.soNumber}
                  </Link>
                </TableCell>
                <TableCell>{so.customer.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t("serviceOrders.units", { count: so.shipments.length })}
                </TableCell>
                <TableCell>
                  <StatusStamp status={so.status} ringOffset="ring-offset-card" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(so.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
