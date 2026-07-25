import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  type LucideIcon,
  MapPin,
  PackageCheck,
  Pencil,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@loopice/shared";
import * as ordersApi from "@/api/orders.api";
import type { Order } from "@/api/orders.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusStamp } from "./statusBadge";

const TRANSITION_ICON: Record<OrderStatus, LucideIcon> = {
  PENDING: CheckCircle2,
  CONFIRMED: CheckCircle2,
  IN_TRANSIT: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditFormState {
  description: string;
  originAddress: string;
  destAddress: string;
  scheduledAt: string;
}

function toEditForm(order: Order): EditFormState {
  return {
    description: order.description ?? "",
    originAddress: order.originAddress ?? "",
    destAddress: order.destAddress ?? "",
    scheduledAt: toDatetimeLocalValue(order.scheduledAt),
  };
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = React.useState<Order | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [transitioning, setTransitioning] = React.useState<OrderStatus | null>(null);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditFormState | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setOrder(await ordersApi.getOrder(id));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleTransition(status: OrderStatus) {
    if (!id) return;
    setError(null);
    setTransitioning(status);
    try {
      const updated = await ordersApi.updateOrderStatus(id, status);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setTransitioning(null);
    }
  }

  function startEditing() {
    if (!order) return;
    setEditForm(toEditForm(order));
    setEditError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditForm(null);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !editForm) return;
    setEditError(null);
    setIsSaving(true);
    try {
      const updated = await ordersApi.updateOrder(id, {
        description: editForm.description || undefined,
        originAddress: editForm.originAddress || undefined,
        destAddress: editForm.destAddress || undefined,
        scheduledAt: editForm.scheduledAt ? new Date(editForm.scheduledAt).toISOString() : null,
      });
      setOrder(updated);
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  if (!order) return <p className="text-muted-foreground">Loading…</p>;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Orders
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Waybill
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              <span className="font-mono">{order.orderNumber}</span>
            </h1>
            <Link
              to={`/customers/${order.customerId}`}
              className="text-sm text-brand-primary hover:underline"
            >
              {order.customer.name}
            </Link>
          </div>
          <StatusStamp status={order.status} className="scale-125" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Details</CardTitle>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Edit
              </button>
            )}
          </CardHeader>

          {isEditing && editForm ? (
            <CardContent>
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Cargo / item description"
                  />
                </div>

                <div className="relative flex flex-col gap-3 py-1">
                  <div className="absolute left-[9px] top-5 h-[calc(100%-40px)] w-px border-l border-dashed border-border" />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-origin" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                      Origin
                    </Label>
                    <Input
                      id="edit-origin"
                      value={editForm.originAddress}
                      onChange={(e) => setEditForm({ ...editForm, originAddress: e.target.value })}
                      placeholder="Pickup address"
                      className="ml-5"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-dest" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-brand-primary" strokeWidth={2} />
                      Destination
                    </Label>
                    <Input
                      id="edit-dest"
                      value={editForm.destAddress}
                      onChange={(e) => setEditForm({ ...editForm, destAddress: e.target.value })}
                      placeholder="Drop-off address"
                      className="ml-5"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-scheduled">Scheduled pickup</Label>
                  <Input
                    id="edit-scheduled"
                    type="datetime-local"
                    value={editForm.scheduledAt}
                    onChange={(e) => setEditForm({ ...editForm, scheduledAt: e.target.value })}
                  />
                </div>

                {editError && <p className="text-sm text-destructive">{editError}</p>}

                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col gap-2 text-sm text-foreground">
              <p>{order.description ?? "No description provided."}</p>
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2 text-muted-foreground">
                <p>
                  <span className="text-foreground">Origin:</span> {order.originAddress ?? "—"}
                </p>
                <p>
                  <span className="text-foreground">Destination:</span> {order.destAddress ?? "—"}
                </p>
                {order.scheduledAt && (
                  <p>
                    <span className="text-foreground">Scheduled:</span>{" "}
                    {new Date(order.scheduledAt).toLocaleString()}
                  </p>
                )}
                <p className="font-mono text-xs">
                  Created {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transition status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {nextStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">No further transitions available.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => {
                const Icon = TRANSITION_ICON[status];
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={status === "CANCELLED" ? "destructive" : "default"}
                    disabled={transitioning !== null}
                    onClick={() => handleTransition(status)}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {transitioning === status ? "Updating…" : `Mark ${status.replace("_", " ")}`}
                  </Button>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-6 pl-1">
            {order.statusHistory.map((entry, i) => (
              <li key={entry.id} className="relative flex gap-4 pl-6">
                {i < order.statusHistory.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-[calc(100%+12px)] w-px bg-border" />
                )}
                <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-card" />
                <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusStamp status={entry.status} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(entry.changedAt).toLocaleString()}
                  </span>
                  {entry.note && <span className="text-sm text-foreground">{entry.note}</span>}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
