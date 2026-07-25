import type { UserRole } from "@loopice/shared";
import { prisma } from "../db/prisma";
import { ForbiddenError } from "./httpError";

export async function findOwnDriverId(tenantId: string, userId: string): Promise<string | null> {
  const driver = await prisma.driver.findFirst({ where: { tenantId, userId }, select: { id: true } });
  return driver?.id ?? null;
}

// requireRole already restricts which roles can reach a given route; this only
// adds a further row-ownership check for the DRIVER role, which is granted
// route-level access to task endpoints but must be confined to its own
// assigned tasks. Every other role that passes requireRole is unrestricted.
export async function assertOwnsTaskOrPrivileged(
  tenantId: string,
  actorUserId: string | null,
  actorRole: UserRole,
  task: { assignedDriverId: string | null }
): Promise<void> {
  if (actorRole !== "DRIVER") return;
  if (!actorUserId) throw new ForbiddenError("You may only access your own assigned tasks");

  const driverId = await findOwnDriverId(tenantId, actorUserId);
  if (!driverId || task.assignedDriverId !== driverId) {
    throw new ForbiddenError("You may only access your own assigned tasks");
  }
}
