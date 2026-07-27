import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
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
  Route,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SERVICE_ORDER_STATUS_TRANSITIONS,
  SHIPMENT_LEG_STATUS_TRANSITIONS,
  SHIPMENT_TYPES,
  type ServiceOrderStatus,
  type ShipmentLegStatus,
  type ShipmentType,
} from "@loopice/shared";
import * as serviceOrdersApi from "@/api/serviceOrders.api";
import type { ServiceOrder } from "@/api/serviceOrders.api";
import * as stationsApi from "@/api/stations.api";
import type { Station } from "@/api/stations.api";
import { ApiError } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusStamp } from "./statusBadge";
import { LegStatusStamp } from "./legStatusBadge";

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

const LEG_TRANSITION_ICON: Record<ShipmentLegStatus, LucideIcon> = {
  PLANNED: CalendarCheck,
  IN_TRANSIT: Truck,
  ARRIVED: PackageCheck,
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

interface LegFormState {
  originStationId: string;
  destStationId: string;
  notes: string;
}

const EMPTY_LEG_FORM: LegFormState = { originStationId: "", destStationId: "", notes: "" };

function formatDimensions(shipment: ServiceOrder["shipments"][number]): string | null {
  const { lengthCm, widthCm, heightCm } = shipment;
  if (!lengthCm && !widthCm && !heightCm) return null;
  return `${lengthCm ?? "—"}×${widthCm ?? "—"}×${heightCm ?? "—"} cm`;
}

export function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
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

  const [stations, setStations] = React.useState<Station[]>([]);
  const [showLegForm, setShowLegForm] = React.useState(false);
  const [legForm, setLegForm] = React.useState<LegFormState>(EMPTY_LEG_FORM);
  const [legError, setLegError] = React.useState<string | null>(null);
  const [isSavingLeg, setIsSavingLeg] = React.useState(false);
  const [transitioningLegId, setTransitioningLegId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setSo(await serviceOrdersApi.getServiceOrder(id));
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    stationsApi.listStations().then(setStations);
  }, []);

  async function handleTransition(status: ServiceOrderStatus) {
    if (!id) return;
    setError(null);
    setTransitioning(status);
    try {
      const updated = await serviceOrdersApi.updateServiceOrderStatus(id, status);
      setSo(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("serviceOrders.failedToUpdateStatus"));
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
      setEditError(err instanceof ApiError ? err.message : t("serviceOrders.failedToSave"));
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
      setShipmentError(err instanceof ApiError ? err.message : t("serviceOrders.failedToAddShipment"));
    } finally {
      setIsSavingShipment(false);
    }
  }

  async function handleDeleteShipment(shipmentId: string) {
    await serviceOrdersApi.deleteShipment(shipmentId);
    await load();
  }

  async function handleAddLeg(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setLegError(null);
    setIsSavingLeg(true);
    try {
      await serviceOrdersApi.createShipmentLeg(id, {
        originStationId: legForm.originStationId,
        destStationId: legForm.destStationId,
        notes: legForm.notes || undefined,
      });
      await load();
      setLegForm(EMPTY_LEG_FORM);
      setShowLegForm(false);
    } catch (err) {
      setLegError(err instanceof ApiError ? err.message : t("serviceOrders.failedToAddLeg"));
    } finally {
      setIsSavingLeg(false);
    }
  }

  async function handleLegTransition(legId: string, status: ShipmentLegStatus) {
    setTransitioningLegId(legId);
    try {
      await serviceOrdersApi.updateShipmentLegStatus(legId, status);
      await load();
    } catch (err) {
      setLegError(err instanceof ApiError ? err.message : t("serviceOrders.failedToUpdateLegStatus"));
    } finally {
      setTransitioningLegId(null);
    }
  }

  async function handleDeleteLeg(legId: string) {
    try {
      await serviceOrdersApi.deleteShipmentLeg(legId);
      await load();
    } catch (err) {
      setLegError(err instanceof ApiError ? err.message : t("serviceOrders.failedToRemoveLeg"));
    }
  }

  if (!so) return <p className="text-muted-foreground">{t("common.loading")}</p>;

  const nextStatuses = SERVICE_ORDER_STATUS_TRANSITIONS[so.status];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          to="/service-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {t("serviceOrders.backLink")}
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {t("serviceOrders.detailEyebrow")}
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
            <CardTitle>{t("serviceOrders.details")}</CardTitle>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                {t("common.edit")}
              </button>
            )}
          </CardHeader>

          {isEditing && editForm ? (
            <CardContent>
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-description">{t("serviceOrders.description")}</Label>
                  <Input
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder={t("serviceOrders.editDescriptionPlaceholder")}
                  />
                </div>

                <div className="relative flex flex-col gap-3 py-1">
                  <div className="absolute left-[9px] top-5 h-[calc(100%-40px)] w-px border-l border-dashed border-border" />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-origin" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                      {t("serviceOrders.origin")}
                    </Label>
                    <Input
                      id="edit-origin"
                      value={editForm.originAddress}
                      onChange={(e) => setEditForm({ ...editForm, originAddress: e.target.value })}
                      placeholder={t("serviceOrders.originPlaceholder")}
                      className="ml-5"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edit-dest" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-brand-primary" strokeWidth={2} />
                      {t("serviceOrders.destination")}
                    </Label>
                    <Input
                      id="edit-dest"
                      value={editForm.destAddress}
                      onChange={(e) => setEditForm({ ...editForm, destAddress: e.target.value })}
                      placeholder={t("serviceOrders.destPlaceholder")}
                      className="ml-5"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-scheduled">{t("serviceOrders.scheduledPickup")}</Label>
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
                    {isSaving ? t("common.saving") : t("serviceOrders.saveChanges")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          ) : (
            <CardContent className="flex flex-col gap-2 text-sm text-foreground">
              <p>{so.description ?? t("serviceOrders.noDescription")}</p>
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2 text-muted-foreground">
                <p>
                  <span className="text-foreground">{t("serviceOrders.originLabel")}</span>{" "}
                  {so.originAddress ?? "—"}
                </p>
                <p>
                  <span className="text-foreground">{t("serviceOrders.destinationLabel")}</span>{" "}
                  {so.destAddress ?? "—"}
                </p>
                {so.scheduledAt && (
                  <p>
                    <span className="text-foreground">{t("serviceOrders.scheduledLabel")}</span>{" "}
                    {new Date(so.scheduledAt).toLocaleString()}
                  </p>
                )}
                <p className="font-mono text-xs">
                  {t("serviceOrders.createdLabel", { date: new Date(so.createdAt).toLocaleString() })}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("serviceOrders.transitionStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {nextStatuses.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("serviceOrders.noTransitions")}</p>
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
                    {transitioning === status
                      ? t("serviceOrders.updating")
                      : t("serviceOrders.mark", { status: t(`status.${status}`) })}
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
          <CardTitle>
            {t("serviceOrders.shipments")} ({so.shipments.length})
          </CardTitle>
          {!showShipmentForm && (
            <button
              onClick={() => setShowShipmentForm(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              {t("serviceOrders.addShipment")}
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
                <Label htmlFor="shipment-type">{t("serviceOrders.type")}</Label>
                <Select
                  id="shipment-type"
                  value={shipmentForm.type}
                  onChange={(e) =>
                    setShipmentForm({ ...shipmentForm, type: e.target.value as ShipmentType })
                  }
                >
                  {SHIPMENT_TYPES.map((shipmentType) => (
                    <option key={shipmentType} value={shipmentType}>
                      {t(`shipmentType.${shipmentType}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-quantity">{t("serviceOrders.quantity")}</Label>
                <Input
                  id="shipment-quantity"
                  type="number"
                  min={1}
                  value={shipmentForm.quantity}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-weight">{t("serviceOrders.weightKg")}</Label>
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
                <Label htmlFor="shipment-length">{t("serviceOrders.lengthCm")}</Label>
                <Input
                  id="shipment-length"
                  type="number"
                  min={0}
                  value={shipmentForm.lengthCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, lengthCm: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-width">{t("serviceOrders.widthCm")}</Label>
                <Input
                  id="shipment-width"
                  type="number"
                  min={0}
                  value={shipmentForm.widthCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, widthCm: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shipment-height">{t("serviceOrders.heightCm")}</Label>
                <Input
                  id="shipment-height"
                  type="number"
                  min={0}
                  value={shipmentForm.heightCm}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, heightCm: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="shipment-description">{t("serviceOrders.description")}</Label>
                <Input
                  id="shipment-description"
                  value={shipmentForm.description}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, description: e.target.value })}
                  placeholder={t("serviceOrders.shipmentDescriptionPlaceholder")}
                />
              </div>

              {shipmentError && (
                <p className="col-span-2 text-sm text-destructive sm:col-span-3">{shipmentError}</p>
              )}

              <div className="col-span-2 flex gap-2 sm:col-span-3">
                <Button type="submit" size="sm" disabled={isSavingShipment}>
                  {isSavingShipment ? t("serviceOrders.adding") : t("serviceOrders.addShipment")}
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
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          )}

          {so.shipments.length === 0 && !showShipmentForm && (
            <p className="text-sm text-muted-foreground">{t("serviceOrders.noShipments")}</p>
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
                      {shipment.quantity}× {t(`shipmentType.${shipment.type}`)}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {[
                        shipment.weightKg ? `${shipment.weightKg} kg` : null,
                        dims,
                        shipment.description,
                      ]
                        .filter(Boolean)
                        .join(" · ") || t("serviceOrders.noFurtherDetail")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteShipment(shipment.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t("serviceOrders.removeShipment")}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-1.5">
            <Route className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            {t("serviceOrders.route")} ({so.shipmentLegs.length})
          </CardTitle>
          {!showLegForm && (
            <button
              onClick={() => setShowLegForm(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              {t("serviceOrders.addLeg")}
            </button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showLegForm && (
            <form
              onSubmit={handleAddLeg}
              className="grid grid-cols-1 gap-3 rounded-md border border-border p-4 sm:grid-cols-3"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leg-origin">{t("serviceOrders.legOriginStation")}</Label>
                <Select
                  id="leg-origin"
                  required
                  value={legForm.originStationId}
                  onChange={(e) => setLegForm({ ...legForm, originStationId: e.target.value })}
                >
                  <option value="" disabled>
                    {t("serviceOrders.selectStation")}
                  </option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.code} — {station.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leg-dest">{t("serviceOrders.legDestStation")}</Label>
                <Select
                  id="leg-dest"
                  required
                  value={legForm.destStationId}
                  onChange={(e) => setLegForm({ ...legForm, destStationId: e.target.value })}
                >
                  <option value="" disabled>
                    {t("serviceOrders.selectStation")}
                  </option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.code} — {station.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="leg-notes">{t("serviceOrders.legNotes")}</Label>
                <Input
                  id="leg-notes"
                  value={legForm.notes}
                  onChange={(e) => setLegForm({ ...legForm, notes: e.target.value })}
                  placeholder={t("serviceOrders.legNotesPlaceholder")}
                />
              </div>

              {legError && <p className="col-span-1 text-sm text-destructive sm:col-span-3">{legError}</p>}

              <div className="col-span-1 flex gap-2 sm:col-span-3">
                <Button type="submit" size="sm" disabled={isSavingLeg}>
                  {isSavingLeg ? t("serviceOrders.adding") : t("serviceOrders.addLeg")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowLegForm(false);
                    setLegForm(EMPTY_LEG_FORM);
                    setLegError(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          )}

          {so.shipmentLegs.length === 0 && !showLegForm && (
            <p className="text-sm text-muted-foreground">{t("serviceOrders.noLegs")}</p>
          )}

          {so.shipmentLegs.map((leg) => {
            const nextLegStatuses = SHIPMENT_LEG_STATUS_TRANSITIONS[leg.status];
            return (
              <div
                key={leg.id}
                className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {t("serviceOrders.legLabel", { sequence: leg.legSequence })}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-sm font-medium text-foreground">
                      {leg.originStation.code}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                      {leg.destStation.code}
                    </span>
                    <LegStatusStamp status={leg.status} />
                  </div>
                  {leg.status === "PLANNED" && (
                    <button
                      onClick={() => handleDeleteLeg(leg.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t("serviceOrders.removeLeg")}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>

                {leg.notes && <p className="text-sm text-muted-foreground">{leg.notes}</p>}

                {nextLegStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {nextLegStatuses.map((status) => {
                      const Icon = LEG_TRANSITION_ICON[status];
                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={status === "CANCELLED" ? "destructive" : "outline"}
                          disabled={transitioningLegId !== null}
                          onClick={() => handleLegTransition(leg.id, status)}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          {transitioningLegId === leg.id
                            ? t("serviceOrders.updating")
                            : t("serviceOrders.mark", { status: t(`shipmentLegStatus.${status}`) })}
                        </Button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {leg.statusHistory.map((entry, i) => (
                    <React.Fragment key={entry.id}>
                      {i > 0 && (
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={2} />
                      )}
                      <span className="inline-flex items-center gap-1">
                        <LegStatusStamp status={entry.status} className="scale-90" />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(entry.changedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("serviceOrders.statusHistory")}</CardTitle>
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
