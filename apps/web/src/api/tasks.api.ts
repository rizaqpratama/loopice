import type {
  DependencyType,
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  ProofType,
  TaskLocationType,
  TaskPriority,
  TaskStatus,
} from "@loopice/shared";
import { apiRequest } from "./client";
import type { Customer, PaginatedResult } from "./customers.api";
import type { Driver } from "./drivers.api";
import type { Partner } from "./partners.api";
import type { Shipment } from "./serviceOrders.api";
import type { Station } from "./stations.api";
import type { RouteSummary } from "./trips.api";
import type { TaskTypeConfig } from "./taskTypes.api";
import type { Team } from "./teams.api";
import type { Vehicle } from "./vehicles.api";
import type { AuthUser } from "@loopice/shared";

export interface TaskServiceOrderSummary {
  id: string;
  soNumber: string;
  status: string;
}

export interface TaskStopSummary {
  id: string;
  sequenceNumber: number;
  name: string | null;
}

export interface TaskTripSummary {
  id: string;
  tripNumber: string;
  status: string;
}

export interface TaskStatusHistoryEntry {
  id: string;
  status: TaskStatus;
  note: string | null;
  previousScheduledDate: string | null;
  previousTimeWindowStart: string | null;
  previousTimeWindowEnd: string | null;
  isOverride: boolean;
  overrideReason: string | null;
  changedBy: AuthUser | null;
  changedAt: string;
}

export interface TaskShipmentLink {
  id: string;
  taskId: string;
  shipmentId: string;
  shipment: Shipment;
}

export interface TaskProofOfCompletion {
  id: string;
  taskId: string;
  type: ProofType;
  fileUrl: string | null;
  textValue: string | null;
  numericValue: number | null;
  latitude: number | null;
  longitude: number | null;
  capturedBy: AuthUser | null;
  capturedAt: string;
}

export interface TaskException {
  id: string;
  taskId: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  description: string | null;
  reportedBy: AuthUser | null;
  reportedAt: string;
  assignedTo: AuthUser | null;
  resolution: string | null;
  resolvedBy: AuthUser | null;
  resolvedAt: string | null;
  followUpTaskId: string | null;
  closedBy: AuthUser | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  tenantId: string;
  taskNumber: string;
  taskTypeId: string;
  taskType: TaskTypeConfig;
  status: TaskStatus;
  priority: TaskPriority;
  serviceOrderId: string | null;
  serviceOrder: TaskServiceOrderSummary | null;
  customerId: string | null;
  customer: Customer | null;
  tripId: string | null;
  trip: TaskTripSummary | null;
  routeId: string | null;
  route: RouteSummary | null;
  stopId: string | null;
  stop: TaskStopSummary | null;
  facilityId: string | null;
  facility: Station | null;
  assignedDriverId: string | null;
  assignedDriver: Driver | null;
  assignedVehicleId: string | null;
  assignedVehicle: Vehicle | null;
  assignedStaffId: string | null;
  assignedStaff: AuthUser | null;
  assignedTeamId: string | null;
  assignedTeam: Team | null;
  assignedPartnerId: string | null;
  assignedPartner: Partner | null;
  locationType: TaskLocationType;
  locationName: string | null;
  locationAddress: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationContactName: string | null;
  locationContactPhone: string | null;
  locationAccessNotes: string | null;
  scheduledDate: string | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  estimatedServiceDurationMinutes: number | null;
  actualStartTime: string | null;
  actualCompletionTime: string | null;
  requiredSkills: string[];
  requiredVehicleCapabilities: string[];
  instructions: string | null;
  notes: string | null;
  sequenceNumber: number | null;
  parentTaskId: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  statusHistory: TaskStatusHistoryEntry[];
  shipmentLinks: TaskShipmentLink[];
  proofs: TaskProofOfCompletion[];
  exceptions: TaskException[];
}

export interface ListTasksParams {
  status?: TaskStatus[];
  taskTypeId?: string;
  priority?: TaskPriority;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  assignedTeamId?: string;
  assignedPartnerId?: string;
  tripId?: string;
  routeId?: string;
  facilityId?: string;
  customerId?: string;
  serviceOrderId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  unassigned?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export function listTasks(params: ListTasksParams = {}) {
  const { status, ...rest } = params;
  return apiRequest<PaginatedResult<Task>>("/tasks", {
    params: {
      ...rest,
      status: status && status.length > 0 ? status.join(",") : undefined,
      unassigned: params.unassigned ? "true" : undefined,
    },
  });
}

export function getTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}`);
}

export interface CreateTaskInput {
  taskTypeId: string;
  priority?: TaskPriority;
  serviceOrderId?: string;
  customerId?: string;
  facilityId?: string;
  shipmentIds?: string[];
  scheduledDate?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  estimatedServiceDurationMinutes?: number;
  requiredSkills?: string[];
  requiredVehicleCapabilities?: string[];
  instructions?: string;
  notes?: string;
  locationType?: TaskLocationType;
  locationName?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationContactName?: string;
  locationContactPhone?: string;
  locationAccessNotes?: string;
}

export function createTask(input: CreateTaskInput, serviceOrderId?: string) {
  const path = serviceOrderId ? `/service-orders/${serviceOrderId}/tasks` : "/tasks";
  return apiRequest<Task>(path, { method: "POST", body: input });
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, "taskTypeId" | "shipmentIds">> {
  expectedVersion: number;
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", body: input });
}

export function updateTaskStatus(id: string, status: TaskStatus, expectedVersion: number, note?: string) {
  return apiRequest<Task>(`/tasks/${id}/status`, { method: "PATCH", body: { status, note, expectedVersion } });
}

export function cancelTask(id: string, reason: string, expectedVersion: number) {
  return apiRequest<Task>(`/tasks/${id}/cancel`, { method: "PATCH", body: { reason, expectedVersion } });
}

export function deleteTask(id: string) {
  return apiRequest<void>(`/tasks/${id}`, { method: "DELETE" });
}

export interface AssignTaskInput {
  assignedDriverId?: string;
  assignedVehicleId?: string;
  assignedStaffId?: string;
  assignedTeamId?: string;
  assignedPartnerId?: string;
  tripId?: string;
  routeId?: string;
  stopId?: string;
  override?: boolean;
  overrideReason?: string;
}

export function assignTask(id: string, input: AssignTaskInput, expectedVersion: number) {
  return apiRequest<Task>(`/tasks/${id}/assign`, { method: "PATCH", body: { ...input, expectedVersion } });
}

export function unassignTask(id: string, expectedVersion: number) {
  return apiRequest<Task>(`/tasks/${id}/unassign`, { method: "PATCH", body: { expectedVersion } });
}

export interface BulkResult {
  taskId: string;
  success: boolean;
  error?: string;
}

export function bulkAssignTasks(taskIds: string[], input: AssignTaskInput) {
  return apiRequest<BulkResult[]>("/tasks/bulk-assign", { method: "POST", body: { taskIds, ...input } });
}

export function bulkUpdateStatus(taskIds: string[], status: TaskStatus, note?: string) {
  return apiRequest<BulkResult[]>("/tasks/bulk-status", { method: "POST", body: { taskIds, status, note } });
}

export interface ProofEntryInput {
  type: ProofType;
  fileUrl?: string;
  textValue?: string;
  numericValue?: number;
  latitude?: number;
  longitude?: number;
}

export function completeTask(
  id: string,
  expectedVersion: number,
  proof?: ProofEntryInput[],
  note?: string
) {
  return apiRequest<Task>(`/tasks/${id}/complete`, {
    method: "PATCH",
    body: { note, proof, expectedVersion },
  });
}

export function partialCompleteTask(
  id: string,
  note: string,
  expectedVersion: number,
  proof?: ProofEntryInput[]
) {
  return apiRequest<Task>(`/tasks/${id}/partial-complete`, {
    method: "PATCH",
    body: { note, proof, expectedVersion },
  });
}

export function failTask(id: string, exceptionType: ExceptionType, expectedVersion: number, note?: string) {
  return apiRequest<Task>(`/tasks/${id}/fail`, {
    method: "PATCH",
    body: { exceptionType, note, expectedVersion },
  });
}

export function addProof(taskId: string, input: ProofEntryInput) {
  return apiRequest<TaskProofOfCompletion>(`/tasks/${taskId}/proof`, { method: "POST", body: input });
}

export interface CreateExceptionInput {
  type: ExceptionType;
  severity?: ExceptionSeverity;
  description?: string;
}

export function reportException(taskId: string, input: CreateExceptionInput) {
  return apiRequest<TaskException>(`/tasks/${taskId}/exceptions`, { method: "POST", body: input });
}

export interface UpdateExceptionInput {
  severity?: ExceptionSeverity;
  status?: ExceptionStatus;
  assignedToId?: string | null;
  resolution?: string;
  followUpTaskId?: string;
}

export function updateException(id: string, input: UpdateExceptionInput) {
  return apiRequest<TaskException>(`/task-exceptions/${id}`, { method: "PATCH", body: input });
}

export interface TaskDependencyEdge {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: DependencyType;
  predecessorTask?: { id: string; taskNumber: string; status: TaskStatus };
  successorTask?: { id: string; taskNumber: string; status: TaskStatus };
}

export interface TaskDependencies {
  asPredecessor: TaskDependencyEdge[];
  asSuccessor: TaskDependencyEdge[];
}

export function listDependencies(taskId: string) {
  return apiRequest<TaskDependencies>(`/tasks/${taskId}/dependencies`);
}

export function addDependency(
  taskId: string,
  input: { relatedTaskId: string; type: DependencyType; direction: "predecessor" | "successor" }
) {
  return apiRequest<TaskDependencies>(`/tasks/${taskId}/dependencies`, { method: "POST", body: input });
}

export function removeDependency(taskId: string, dependencyId: string) {
  return apiRequest<void>(`/tasks/${taskId}/dependencies/${dependencyId}`, { method: "DELETE" });
}
