import type { OrderStatus } from "@loopice/shared";
import { apiRequest } from "./client";
import type { Customer, PaginatedResult } from "./customers.api";

export interface OrderStatusHistoryEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  changedAt: string;
}

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  description: string | null;
  status: OrderStatus;
  originAddress: string | null;
  destAddress: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: OrderStatusHistoryEntry[];
}

export interface ListOrdersParams {
  status?: OrderStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export function listOrders(params: ListOrdersParams = {}) {
  return apiRequest<PaginatedResult<Order>>("/orders", { params });
}

export function getOrder(id: string) {
  return apiRequest<Order>(`/orders/${id}`);
}

export interface CreateOrderInput {
  customerId: string;
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string;
}

export function createOrder(input: CreateOrderInput) {
  return apiRequest<Order>("/orders", { method: "POST", body: input });
}

export function updateOrderStatus(id: string, status: OrderStatus, note?: string) {
  return apiRequest<Order>(`/orders/${id}/status`, { method: "PATCH", body: { status, note } });
}
