import type { UserRole } from "@loopice/shared";
import * as React from "react";
import { useAuth } from "@/context/AuthContext";

export function RoleGate({
  allow,
  children,
  fallback = null,
}: {
  allow: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
