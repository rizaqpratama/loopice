import type { ServiceOrderStatus, ShipmentLegStatus, ShipmentType } from "@loopice/shared";
import { apiRequest } from "./client";
import type { Customer, PaginatedResult } from "./customers.api";
import type { Station } from "./stations.api";

export interface ServiceOrderStatusHistoryEntry {
  id: string;
  status: ServiceOrderStatus;
  note: string | null;
  changedAt: string;
}

export interface Shipment {
  id: string;
  serviceOrderId: string;
  type: ShipmentType;
  quantity: number;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentLegStatusHistoryEntry {
  id: string;
  status: ShipmentLegStatus;
  note: string | null;
  changedAt: string;
}

export interface ShipmentLeg {
  id: string;
  serviceOrderId: string;
  legSequence: number;
  originStationId: string;
  originStation: Station;
  destStationId: string;
  destStation: Station;
  status: ShipmentLegStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: ShipmentLegStatusHistoryEntry[];
}

export interface ServiceOrder {
  id: string;
  tenantId: string;
  soNumber: string;
  customerId: string;
  customer: Customer;
  description: string | null;
  status: ServiceOrderStatus;
  originAddress: string | null;
  destAddress: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: ServiceOrderStatusHistoryEntry[];
  shipments: Shipment[];
  shipmentLegs: ShipmentLeg[];
}

export interface ListServiceOrdersParams {
  status?: ServiceOrderStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export function listServiceOrders(params: ListServiceOrdersParams = {}) {
  return apiRequest<PaginatedResult<ServiceOrder>>("/service-orders", { params });
}

export function getServiceOrder(id: string) {
  return apiRequest<ServiceOrder>(`/service-orders/${id}`);
}

export interface CreateServiceOrderInput {
  customerId: string;
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string;
}

export function createServiceOrder(input: CreateServiceOrderInput) {
  return apiRequest<ServiceOrder>("/service-orders", { method: "POST", body: input });
}

export interface UpdateServiceOrderInput {
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string | null;
}

export function updateServiceOrder(id: string, input: UpdateServiceOrderInput) {
  return apiRequest<ServiceOrder>(`/service-orders/${id}`, { method: "PATCH", body: input });
}

export function updateServiceOrderStatus(id: string, status: ServiceOrderStatus, note?: string) {
  return apiRequest<ServiceOrder>(`/service-orders/${id}/status`, {
    method: "PATCH",
    body: { status, note },
  });
}

export interface ShipmentInput {
  type: ShipmentType;
  quantity?: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  description?: string;
}

export function createShipment(serviceOrderId: string, input: ShipmentInput) {
  return apiRequest<Shipment>(`/service-orders/${serviceOrderId}/shipments`, {
    method: "POST",
    body: input,
  });
}

export function updateShipment(id: string, input: Partial<ShipmentInput>) {
  return apiRequest<Shipment>(`/shipments/${id}`, { method: "PATCH", body: input });
}

export function deleteShipment(id: string) {
  return apiRequest<void>(`/shipments/${id}`, { method: "DELETE" });
}

export interface ShipmentLegInput {
  originStationId: string;
  destStationId: string;
  notes?: string;
}

export function createShipmentLeg(serviceOrderId: string, input: ShipmentLegInput) {
  return apiRequest<ShipmentLeg>(`/service-orders/${serviceOrderId}/legs`, {
    method: "POST",
    body: input,
  });
}

export function updateShipmentLegStatus(id: string, status: ShipmentLegStatus, note?: string) {
  return apiRequest<ShipmentLeg>(`/shipment-legs/${id}/status`, {
    method: "PATCH",
    body: { status, note },
  });
}

export function deleteShipmentLeg(id: string) {
  return apiRequest<void>(`/shipment-legs/${id}`, { method: "DELETE" });
}
