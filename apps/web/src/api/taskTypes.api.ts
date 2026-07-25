import type {
  AssigneeType,
  CargoRequirement,
  ExceptionType,
  LocationRequirement,
  ProofType,
  TaskStatus,
} from "@loopice/shared";
import { apiRequest } from "./client";

export interface TaskTypeConfig {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: string;
  allowedStatuses: TaskStatus[];
  requiredFields: string[];
  requiredProofTypes: ProofType[];
  allowedAssigneeTypes: AssigneeType[];
  defaultServiceDurationMinutes: number | null;
  locationRequirement: LocationRequirement;
  cargoRequirement: CargoRequirement;
  facilityRequirement: boolean;
  isRouteable: boolean;
  isBillable: boolean;
  isCustomerFacing: boolean;
  failureReasonCodes: ExceptionType[];
  completionChecklist: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listTaskTypes(search?: string) {
  return apiRequest<TaskTypeConfig[]>("/task-types", { params: { search } });
}

export interface TaskTypeConfigInput {
  code: string;
  name: string;
  category: string;
  allowedStatuses?: TaskStatus[];
  requiredFields?: string[];
  requiredProofTypes?: ProofType[];
  allowedAssigneeTypes?: AssigneeType[];
  defaultServiceDurationMinutes?: number;
  locationRequirement?: LocationRequirement;
  cargoRequirement?: CargoRequirement;
  facilityRequirement?: boolean;
  isRouteable?: boolean;
  isBillable?: boolean;
  isCustomerFacing?: boolean;
  failureReasonCodes?: ExceptionType[];
  completionChecklist?: string[];
}

export function createTaskType(input: TaskTypeConfigInput) {
  return apiRequest<TaskTypeConfig>("/task-types", { method: "POST", body: input });
}

export function updateTaskType(id: string, input: Partial<TaskTypeConfigInput> & { isActive?: boolean }) {
  return apiRequest<TaskTypeConfig>(`/task-types/${id}`, { method: "PATCH", body: input });
}

export function deactivateTaskType(id: string) {
  return apiRequest<void>(`/task-types/${id}`, { method: "DELETE" });
}
