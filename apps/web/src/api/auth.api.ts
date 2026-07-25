import type { AuthUser, LoginResponse } from "@loopice/shared";
import { apiRequest } from "./client";

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export function me() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}
