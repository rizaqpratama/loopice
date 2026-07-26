import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { recordAudit } from "../../lib/auditLog";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/httpError";

const RECONCILIATION_INCLUDE = {
  trip: true,
  manifest: true,
  destinationFacility: true,
  completedBy: true,
} satisfies Prisma.ReceivingReconciliationInclude;

async function findScopedReconciliation(tenantId: string, id: string) {
  const reconciliation = await prisma.receivingReconciliation.findFirst({
    where: { id, tenantId },
    include: RECONCILIATION_INCLUDE,
  });
  if (!reconciliation) throw new NotFoundError("Receiving reconciliation not found");
  return reconciliation;
}

export interface StartReconciliationInput {
  tripId: string;
  manifestId: string;
  destinationFacilityId: string;
}

export async function startReconciliation(
  tenantId: string,
  input: StartReconciliationInput,
  userId: string | null
) {
  const manifest = await prisma.manifest.findFirst({
    where: { id: input.manifestId, tenantId, tripId: input.tripId },
  });
  if (!manifest) throw new BadRequestError("Manifest not found for this trip");

  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, tenantId },
  });
  if (!trip) throw new BadRequestError("Trip not found");

  const facility = await prisma.station.findFirst({
    where: { id: input.destinationFacilityId, tenantId },
  });
  if (!facility) throw new BadRequestError("Facility not found");

  // Check if reconciliation already exists for this manifest
  const existing = await prisma.receivingReconciliation.findUnique({
    where: { manifestId: input.manifestId },
  });
  if (existing) throw new ConflictError("Reconciliation already exists for this manifest");

  const items = await prisma.manifestItem.findMany({
    where: { manifestId: input.manifestId },
  });

  const created = await prisma.receivingReconciliation.create({
    data: {
      tenantId,
      tripId: input.tripId,
      manifestId: input.manifestId,
      destinationFacilityId: input.destinationFacilityId,
      status: "PENDING",
      expectedItemCount: items.length,
      startedAt: new Date(),
    },
    include: RECONCILIATION_INCLUDE,
  });

  domainEvents.emitTyped("manifest.unloading_started", {
    manifestId: input.manifestId,
    tenantId,
    tripId: input.tripId,
  });

  return created;
}

export async function getReconciliation(tenantId: string, id: string) {
  return findScopedReconciliation(tenantId, id);
}

export interface ListReconciliationsParams {
  tripId?: string;
  manifestId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

export async function listReconciliations(tenantId: string, params: ListReconciliationsParams) {
  return prisma.receivingReconciliation.findMany({
    where: {
      tenantId,
      ...(params.tripId ? { tripId: params.tripId } : {}),
      ...(params.manifestId ? { manifestId: params.manifestId } : {}),
      ...(params.status ? { status: params.status as any } : {}),
    },
    include: RECONCILIATION_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: params.skip ?? 0,
    take: params.take ?? 50,
  });
}

export interface RecordReconciliationCountsInput {
  counts: Array<{
    itemId: string;
    receivedQuantity: number;
    condition?: string;
  }>;
}

export async function recordReconciliationCounts(
  tenantId: string,
  reconciliationId: string,
  input: RecordReconciliationCountsInput,
  userId: string | null
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  if (reconciliation.status === "COMPLETED" || reconciliation.status === "CANCELLED") {
    throw new BadRequestError("Cannot record counts on completed/cancelled reconciliation");
  }

  await prisma.$transaction(async (tx) => {
    // Update each item with received quantity
    for (const count of input.counts) {
      const item = await tx.manifestItem.findFirst({
        where: { id: count.itemId, manifestId: reconciliation.manifestId, tenantId },
      });
      if (!item) throw new NotFoundError(`Manifest item ${count.itemId} not found`);

      await tx.manifestItem.update({
        where: { id: count.itemId },
        data: {
          receivedQuantity: count.receivedQuantity,
          conditionAtReceiving: count.condition,
          receivingStatus: "RECEIVED",
        },
      });
    }

    // Recompute reconciliation status
    await recomputeReconciliationStatus(tx, reconciliation.id, tenantId);

    // Record audit
    await recordAudit(tx, {
      tenantId,
      entityType: "ReceivingReconciliation",
      entityId: reconciliationId,
      action: "RECEIVING_COUNTS_RECORDED",
      beforeValue: { status: reconciliation.status },
      afterValue: { itemsUpdated: input.counts.length },
      actorId: userId,
    });
  });

  const updated = await findScopedReconciliation(tenantId, reconciliationId);
  return updated;
}

async function recomputeReconciliationStatus(
  tx: Prisma.TransactionClient,
  reconciliationId: string,
  tenantId: string
) {
  const reconciliation = await tx.receivingReconciliation.findUniqueOrThrow({
    where: { id: reconciliationId },
  });

  const items = await tx.manifestItem.findMany({
    where: { manifestId: reconciliation.manifestId, tenantId },
  });

  let matchedCount = 0;
  let missingCount = 0;
  let excessCount = 0;
  let damagedCount = 0;
  let unidentifiedCount = 0;

  for (const item of items) {
    const planned = item.plannedQuantity || 0;
    const received = item.receivedQuantity || 0;

    if (item.receivingStatus === "RECEIVED" || item.receivingStatus === "PARTIALLY_RECEIVED") {
      if (received === planned) {
        matchedCount++;
      } else if (received < planned) {
        missingCount++;
      } else if (received > planned) {
        excessCount++;
      }
    } else if (item.receivingStatus === "MISSING") {
      missingCount++;
    } else if (item.receivingStatus === "DAMAGED") {
      damagedCount++;
    } else if (item.receivingStatus === "UNIDENTIFIED") {
      unidentifiedCount++;
    }
  }

  const hasDiscrepancy = missingCount > 0 || excessCount > 0 || damagedCount > 0 || unidentifiedCount > 0;
  const newStatus = hasDiscrepancy ? "DISCREPANCY" : "MATCHED";

  await tx.receivingReconciliation.update({
    where: { id: reconciliationId },
    data: {
      status: newStatus,
      matchedItemCount: matchedCount,
      missingItemCount: missingCount,
      excessItemCount: excessCount,
      damagedItemCount: damagedCount,
      unidentifiedItemCount: unidentifiedCount,
      receivedItemCount: items.filter((i) => i.receivedQuantity !== null).length,
    },
  });
}

export async function completeReconciliation(
  tenantId: string,
  reconciliationId: string,
  userRole?: string,
  userId?: string
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  // Check permission: FACILITY_SUPERVISOR+ required for DISCREPANCY status
  if (reconciliation.status === "DISCREPANCY") {
    const allowedRoles = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "FACILITY_SUPERVISOR"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenError("Only facility supervisors can approve discrepancies");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.receivingReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: userId ?? undefined,
      },
      include: RECONCILIATION_INCLUDE,
    });

    await recordAudit(tx, {
      tenantId,
      entityType: "ReceivingReconciliation",
      entityId: reconciliationId,
      action: "RECONCILIATION_COMPLETED",
      beforeValue: { status: reconciliation.status },
      afterValue: { status: "COMPLETED" },
      actorId: userId,
    });

    return result;
  });

  domainEvents.emitTyped("manifest.receiving_completed", {
    manifestId: reconciliation.manifestId,
    tenantId,
    tripId: reconciliation.tripId,
  });

  return updated;
}

export interface SpawnDiscrepancyTaskInput {
  itemId: string;
  taskTypeId: string;
}

export async function spawnDiscrepancyTask(
  tenantId: string,
  reconciliationId: string,
  input: SpawnDiscrepancyTaskInput,
  userId: string | null
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  if (reconciliation.status !== "DISCREPANCY") {
    throw new BadRequestError("Can only spawn follow-up tasks from DISCREPANCY status");
  }

  const item = await prisma.manifestItem.findFirst({
    where: { id: input.itemId, manifestId: reconciliation.manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const taskType = await prisma.taskType.findFirst({
    where: { id: input.taskTypeId, tenantId },
  });
  if (!taskType) throw new BadRequestError("Task type not found");

  // Create follow-up exception
  const exception = await prisma.taskException.create({
    data: {
      tenantId,
      manifestId: reconciliation.manifestId,
      type: "CARGO_MISSING",
      severity: "MEDIUM",
      status: "OPEN",
      description: `Discrepancy detected for manifest item: ${item.identifier || item.id}`,
      reportedById: userId ?? undefined,
    },
  });

  // Create follow-up task
  const manifest = await prisma.manifest.findUniqueOrThrow({
    where: { id: reconciliation.manifestId },
  });

  const task = await prisma.task.create({
    data: {
      tenantId,
      taskNumber: `TASK-${Date.now()}`,
      taskTypeId: input.taskTypeId,
      customerId: manifest.tripId, // Use trip as reference
      facilityId: reconciliation.destinationFacilityId,
      status: "OPEN",
      priority: "HIGH",
      notes: `Follow-up for discrepancy: ${item.identifier || item.id}`,
      createdById: userId ?? undefined,
    },
  });

  // Link exception to task
  await prisma.taskException.update({
    where: { id: exception.id },
    data: { followUpTaskId: task.id },
  });

  domainEvents.emitTyped("manifest.discrepancy_detected", {
    manifestId: reconciliation.manifestId,
    tenantId,
    tripId: reconciliation.tripId,
    itemId: item.id,
    discrepancyType: item.discrepancyType || "MISSING",
  });

  return task;
}
