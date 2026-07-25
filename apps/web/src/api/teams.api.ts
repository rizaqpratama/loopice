import { apiRequest } from "./client";
import type { AuthUser } from "@loopice/shared";

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  user: AuthUser;
  joinedAt: string;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader: AuthUser | null;
  isActive: boolean;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export function listTeams(search?: string) {
  return apiRequest<Team[]>("/teams", { params: { search } });
}

export interface TeamInput {
  name: string;
  description?: string;
  leaderId?: string;
}

export function createTeam(input: TeamInput) {
  return apiRequest<Team>("/teams", { method: "POST", body: input });
}

export function updateTeam(id: string, input: Partial<TeamInput> & { isActive?: boolean }) {
  return apiRequest<Team>(`/teams/${id}`, { method: "PATCH", body: input });
}

export function deactivateTeam(id: string) {
  return apiRequest<void>(`/teams/${id}`, { method: "DELETE" });
}

export function addTeamMember(teamId: string, userId: string) {
  return apiRequest<Team>(`/teams/${teamId}/members`, { method: "POST", body: { userId } });
}

export function removeTeamMember(teamId: string, userId: string) {
  return apiRequest<Team>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}
