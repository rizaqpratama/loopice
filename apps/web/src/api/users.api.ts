import type { AuthUser, UserRole } from "@loopice/shared";
import { apiRequest } from "./client";

export function listUsers() {
  return apiRequest<AuthUser[]>("/users");
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export function createUser(input: CreateUserInput) {
  return apiRequest<AuthUser>("/users", { method: "POST", body: input });
}

export function deactivateUser(id: string) {
  return apiRequest<AuthUser>(`/users/${id}`, { method: "DELETE" });
}
