import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Box,
  CalendarCheck,
  CheckCircle2,
  FileEdit,
  FileText,
  Layers,
  type LucideIcon,
  MapPin,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import {
  SERVICE_ORDER_STATUS_TRANSITIONS,
  SHIPMENT_TYPES,
  type ServiceOrderStatus,
  type ShipmentType,
} from "@loopice/shared";
import * as serviceOrdersApi from "@/api/serviceOrders.api";
import type { ServiceOrder } from "@/api/serviceOrders.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusStamp } from "./statusBadge";

const TRANSITION_ICON: Record<ServiceOrderStatus, LucideIcon> = {
  DRAFT: FileEdit,
  QUOTED: FileText,
  CONFIRMED: CheckCircle2,
  PLANNED: CalendarCheck,
  IN_PROGRESS: Truck,
  COMPLETED: PackageCheck,
  BILLED: Receipt,
  CLOSED: Archive,
  CANCELLED: XCircle,
};

const SHIPMENT_TYPE_ICON: Record<ShipmentType, LucideIcon> = {
  PALLET: Layers,
  CONTAINER: Box,
  PARCEL: Package,
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

function toEditForm(so: ServiceOrder): EditFormState {
  return {
    description: so.description ?? "",
    originAddress: so.originAddress ?? "",
    destAddress: so.destAddress ?? "",
    scheduledAt: toDatetimeLocalValue(so.scheduledAt),
  };
}

interface ShipmentFormState {
  type: ShipmentType;
  quantity: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  description: string;
}

const EMPTY_SHIPMENT_FORM: ShipmentFormState = {
  type: "PALLET",
  quantity: "1",
  weightKg: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  description: "",
};

function formatDimensions(shipment: ServiceOrder["shipments"][number]): string | null {
  const { lengthCm, widthCm, heightCm } = shipment;
  if (!lengthCm && !widthCm && !heightCm) return null;
  return `${lengthCm ?? "—"}×${widthCm ?? "—"}×${heightCm ?? "—"} cm`;
}

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [so, setSo] = React.useState<ServiceOrder | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [transitioning, setTransitioning] = React.useState<ServiceOrderStatus | null>(null);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditFormState | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const [showShipmentForm, setShowShipmentForm] = React.useState(false);
  const [shipmentForm, setShipmentForm] = React.useState<ShipmentFormState>(EMPTY_SHIPMENT_FORM);
  const [shipmentError, setShipmentError] = React.useState<string | null>(null);
  const [isSavingShipment, setIsSavingShipment] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setSo(await serviceOrdersApi.getServiceOrder(id));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleTransition(status: ServiceOrderStatus) {
    if (!id) return;
    setError(null);
    setTransitioning(status);
    try {
      const updated = await serviceOrdersApi.updateServiceOrderStatus(id, status);
      setSo(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setTransitioning(null);
    }
  }

  function startEditing() {
    if (!so) return;
    setEditForm(toEditForm(so));
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
      const updated = await serviceOrdersApi.updateServiceOrder(id, {
        description: editForm.description || undefined,
        originAddress: editForm.originAddress || undefined,
        destAddress: editForm.destAddress || undefined,
        scheduledAt: editForm.scheduledAt ? new Date(editForm.scheduledAt).toISOString() : null,
      });
      setSo(updated);
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setShipmentError(null);
    setIsSavingShipment(true);
    try {
      await serviceOrdersApi.createShipment(id, {
        type: shipmentForm.type,
        quantity: shipmentForm.quantity ? Number(shipmentForm.quantity) : undefined,
        weightKg: shipmentForm.weightKg ? Number(shipmentForm.weightKg) : undefined,
        lengthCm: shipmentForm.lengthCm ? Number(shipmentForm.lengthCm) : undefined,
        widthCm: shipmentForm.widthCm ? Number(shipmentForm.widthCm) : undefined,
        heightCm: shipmentForm.heightCm ? Number(shipmentForm.heightCm) : undefined,
        description: shipmentForm.description || undefined,
      });
      await load();
      setShipmentForm(EMPTY_SHIPMENT_FORM);
      setShowShipmentForm(false);
    } catch (err) {
      setShipmentError(err instanceof ApiError ? err.message : "Failed to add shipment");
    } finally {
      setIsSavingShipment(false);
    }
  }

  async function handleDeleteShipment(shipmentId: string) {
    await serviceOrdersApi.deleteShipment(shipmentId);
    await load();
  }

  if (!so) return <p className="text-muted-foreground">Loading…</p>;

  const nextStatuses = SERVICE_ORDER_STATUS_TRANSITIONS[so.status];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/service-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Service Orders
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Service order
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              <span className="font-mono">{so.soNumber}</span>
            </h1>
            <Link
              to={`/customers/${so.customerId}`}
              className="text-sm text-brand-primary hover:underline"
            >
              {so.customer.name}
            </Link>
          </div>
          <StatusStamp status={so.status} className="scale-125" />
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
                    placeholder="Job notes"
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
              <p>{so.description ?? "No description provided."}</p>
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2 text-muted-foreground">
                <p>
                  <span className="text-foreground">Origin:</span> {so.originAddress ?? "—"}
                </p>
                <p>
                  <span className="text-foreground">Destination:</span> {so.destAddress ?? "—"}
                </p>
                {so.scheduledAt && (
                  <p>
                    <span className="text-foreground">Scheduled:</span>{" "}
                    {new Date(so.scheduledAt).toLocaleString()}
                  </p>
                )}
                <p className="font-mono text-xs">Created {new Date(so.createdAt).toLocaleString()}</p>
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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Shipments ({so.shipments.length})</CardTitle>
          {!showShipmentForm && (
            <button
              onClick={() => setShowShipmentForm(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Add shipment
            </button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {showShipmentForm && (
            <form
              onSubmit={handleAddShipment}
              className="grid grid-cols-2 gap-3 rounded-md border border-border p-4 sm:grid-cols-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-type">Type</Label>
                <Select
                  id="shipment-type"
                  value={shipmentForm.type}
                  onChange={(e) =>
                    setShipmentForm({ ...shipmentForm, type: e.target.value as ShipmentType })
                  }
                >
                  {SHIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-quantity">Quantity</Label>
                <Input
                  id="shipment-quantity"
                  type="number"
                  min={1}
                  value={shipmentForm.quantity}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-weight">Weight (kg)</Label>
                <Input
                  id="shipment-weight"
                  type="number"
                  min={0}
                  step="0.1"
                  value={shipmentForm.weightKg}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, weightKg: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-length">Length (cm)</Label>
                <Input
                  id="shipment-length"
                  type="number"
                  min={0}
                  value={shipmentForm.lengthCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, lengthCm: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-width">Width (cm)</Label>
                <Input
                  id="shipment-width"
                  type="number"
                  min={0}
                  value={shipmentForm.widthCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, widthCm: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-height">Height (cm)</Label>
                <Input
                  id="shipment-height"
                  type="number"
                  min={0}
                  value={shipmentForm.heightCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, heightCm: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="shipment-description">Description</Label>
                <Input
                  id="shipment-description"
                  value={shipmentForm.description}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, description: e.target.value })}
                  placeholder="e.g. Fragile, stack no more than 2 high"
                />
              </div>

              {shipmentError && (
                <p className="col-span-2 text-sm text-destructive sm:col-span-3">{shipmentError}</p>
              )}

              <div className="col-span-2 flex gap-2 sm:col-span-3">
                <Button type="submit" size="sm" disabled={isSavingShipment}>
                  {isSavingShipment ? "Adding…" : "Add shipment"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowShipmentForm(false);
                    setShipmentForm(EMPTY_SHIPMENT_FORM);
                    setShipmentError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {so.shipments.length === 0 && !showShipmentForm && (
            <p className="text-sm text-muted-foreground">
              No pallets, containers, or parcels added yet.
            </p>
          )}

          {so.shipments.map((shipment) => {
            const Icon = SHIPMENT_TYPE_ICON[shipment.type];
            const dims = formatDimensions(shipment);
            return (
              <div
                key={shipment.id}
                className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {shipment.quantity}× {shipment.type}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {[
                        shipment.weightKg ? `${shipment.weightKg} kg` : null,
                        dims,
                        shipment.description,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No further detail"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteShipment(shipment.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove shipment"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative flex flex-col gap-6 pl-1">
            {so.statusHistory.map((entry, i) => (
              <li key={entry.id} className="relative flex gap-4 pl-6">
                {i < so.statusHistory.length - 1 && (
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
