import { apiRequest } from "./client";

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithOrders extends Customer {
  orders: Array<{ id: string; orderNumber: string; status: string; createdAt: string }>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | undefined;
}

export function listCustomers(params: ListCustomersParams = {}) {
  return apiRequest<PaginatedResult<Customer>>("/customers", { params });
}

export function getCustomer(id: string) {
  return apiRequest<CustomerWithOrders>(`/customers/${id}`);
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export function createCustomer(input: CustomerInput) {
  return apiRequest<Customer>("/customers", { method: "POST", body: input });
}
