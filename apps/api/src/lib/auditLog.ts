import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

export interface AuditLogInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeValue?: any;
  afterValue?: any;
  reason?: string;
  isOverride?: boolean;
  actorId?: string | null;
  source?: string;
  deviceId?: string;
  correlationId?: string;
  clientRequestId?: string;
}

export async function recordAudit(tx: Prisma.TransactionClient | typeof prisma, input: AuditLogInput) {
  const prismaClient = tx as typeof prisma;

  return prismaClient.auditLog.create({
    data: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeValue: input.beforeValue ? JSON.stringify(input.beforeValue) : undefined,
      afterValue: input.afterValue ? JSON.stringify(input.afterValue) : undefined,
      reason: input.reason,
      isOverride: input.isOverride ?? false,
      actorId: input.actorId ?? undefined,
      source: input.source ?? "API",
      deviceId: input.deviceId,
      correlationId: input.correlationId,
      clientRequestId: input.clientRequestId,
    },
  });
}
