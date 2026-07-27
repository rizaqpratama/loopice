import { apiRequest } from "./client";
import type { Station } from "./stations.api";

export interface RouteStop {
  id: string;
  routeId: string;
  sequenceNumber: number;
  facilityId: string | null;
  facility: Station | null;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutePlan {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  description: string | null;
  isTemplate: boolean;
  isActive: boolean;
  stops: RouteStop[];
  createdAt: string;
  updatedAt: string;
}

export function listRoutePlans(search?: string) {
  return apiRequest<RoutePlan[]>("/route-plans", { params: { search } });
}

export interface RoutePlanInput {
  name: string;
  code?: string;
  description?: string;
  isTemplate?: boolean;
}

export function createRoutePlan(input: RoutePlanInput) {
  return apiRequest<RoutePlan>("/route-plans", { method: "POST", body: input });
}

export function getRoutePlan(id: string) {
  return apiRequest<RoutePlan>(`/route-plans/${id}`);
}

export function updateRoutePlan(id: string, input: Partial<RoutePlanInput> & { isActive?: boolean }) {
  return apiRequest<RoutePlan>(`/route-plans/${id}`, { method: "PATCH", body: input });
}

export interface RouteStopInput {
  facilityId?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export function createRouteStop(routeId: string, input: RouteStopInput) {
  return apiRequest<RoutePlan>(`/route-plans/${routeId}/stops`, { method: "POST", body: input });
}

export function deleteRouteStop(id: string) {
  return apiRequest<void>(`/route-stops/${id}`, { method: "DELETE" });
}

export function reorderRouteTaskSequence(routeId: string, taskIds: string[]) {
  return apiRequest<unknown>(`/route-plans/${routeId}/sequence`, { method: "PATCH", body: { taskIds } });
}
