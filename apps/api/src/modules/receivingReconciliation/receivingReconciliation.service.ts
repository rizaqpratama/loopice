import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { domainEvents } from "../../lib/domainEvents";
import { recordAudit } from "../../lib/auditLog";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../lib/httpError";
import { closeManifestInTx } from "../manifests/manifests.service";

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
    condition?: "GOOD" | "DAMAGED" | "UNIDENTIFIED";
    conditionNotes?: string;
  }>;
}

export async function recordReconciliationCounts(
  tenantId: string,
  reconciliationId: string,
  input: RecordReconciliationCountsInput,
  expectedVersion: number,
  userId: string | null
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  if (reconciliation.status === "COMPLETED" || reconciliation.status === "CANCELLED") {
    throw new BadRequestError("Cannot record counts on completed/cancelled reconciliation");
  }

  await prisma.$transaction(async (tx) => {
    const versionResult = await tx.receivingReconciliation.updateMany({
      where: { id: reconciliationId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    if (versionResult.count === 0) {
      throw new ConflictError(
        `Reconciliation was modified by someone else (expected version ${expectedVersion})`
      );
    }

    // Update each item with received quantity. receivingStatus is derived
    // from the reported condition first (DAMAGED/UNIDENTIFIED are always
    // that status regardless of quantity), then from the quantity
    // comparison otherwise -- previously this unconditionally force-set
    // RECEIVED, which made DAMAGED/UNIDENTIFIED unreachable through this
    // endpoint even though recomputeReconciliationStatus below branches on
    // exactly those statuses.
    for (const count of input.counts) {
      const item = await tx.manifestItem.findFirst({
        where: { id: count.itemId, manifestId: reconciliation.manifestId, tenantId },
      });
      if (!item) throw new NotFoundError(`Manifest item ${count.itemId} not found`);

      const receivingStatus =
        count.condition === "DAMAGED"
          ? "DAMAGED"
          : count.condition === "UNIDENTIFIED"
            ? "UNIDENTIFIED"
            : count.receivedQuantity <= 0
              ? "MISSING"
              : (item.plannedQuantity ?? 0) > 0 && count.receivedQuantity < (item.plannedQuantity ?? 0)
                ? "PARTIALLY_RECEIVED"
                : "RECEIVED";

      await tx.manifestItem.update({
        where: { id: count.itemId },
        data: {
          receivedQuantity: count.receivedQuantity,
          conditionAtReceiving: count.conditionNotes ?? count.condition,
          receivingStatus,
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
    // Compare against what was actually loaded onto the vehicle when known
    // -- loading can legitimately differ from the plan -- falling back to
    // plannedQuantity only for items that never went through the loading
    // status update (loadedQuantity still null).
    const baseline = item.loadedQuantity ?? item.plannedQuantity ?? 0;
    const received = item.receivedQuantity || 0;

    if (item.receivingStatus === "RECEIVED" || item.receivingStatus === "PARTIALLY_RECEIVED") {
      if (received === baseline) {
        matchedCount++;
      } else if (received < baseline) {
        missingCount++;
      } else if (received > baseline) {
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
  expectedVersion: number,
  userRole?: string,
  userId: string | null = null
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  if (reconciliation.status === "COMPLETED") {
    throw new BadRequestError("Reconciliation already completed");
  }

  // Check permission: FACILITY_SUPERVISOR+ required for DISCREPANCY status
  if (reconciliation.status === "DISCREPANCY") {
    const allowedRoles = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "FACILITY_SUPERVISOR"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ForbiddenError("Only facility supervisors can approve discrepancies");
    }
  }

  await prisma.$transaction(async (tx) => {
    // Re-check status fresh inside the transaction: the version-gated
    // update below already prevents an unsafe write if status changed
    // between the read above and here (a concurrent status flip bumps
    // version, so a stale expectedVersion fails), but re-reading keeps the
    // permission decision itself based on current, not stale, data.
    const fresh = await tx.receivingReconciliation.findUniqueOrThrow({
      where: { id: reconciliationId },
    });
    if (fresh.status === "COMPLETED") {
      throw new BadRequestError("Reconciliation already completed");
    }
    if (fresh.status === "DISCREPANCY") {
      const allowedRoles = ["TENANT_ADMIN", "OPERATIONS_MANAGER", "FACILITY_SUPERVISOR"];
      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ForbiddenError("Only facility supervisors can approve discrepancies");
      }
    }

    const result = await tx.receivingReconciliation.updateMany({
      where: { id: reconciliationId, version: expectedVersion, status: { not: "COMPLETED" } },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: userId ?? undefined,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConflictError(
        `Reconciliation was modified by someone else (expected version ${expectedVersion})`
      );
    }

    await recordAudit(tx, {
      tenantId,
      entityType: "ReceivingReconciliation",
      entityId: reconciliationId,
      action: "RECONCILIATION_COMPLETED",
      beforeValue: { status: reconciliation.status },
      afterValue: { status: "COMPLETED" },
      actorId: userId,
    });

    // Completing reconciliation closes the manifest. Nothing else mirrors
    // the reconciliation's MATCHED/DISCREPANCY outcome onto Manifest.status
    // (a separate state machine), so bridge it here before closing --
    // matching canTransitionManifestStatus's RECONCILING -> {MATCHED,
    // DISCREPANCY} -> CLOSED path. A manifest that never reached RECONCILING
    // (e.g. this reconciliation was cancelled before any counts were
    // recorded) is left alone.
    const manifest = await tx.manifest.findUnique({ where: { id: reconciliation.manifestId } });
    if (manifest) {
      const reconciliationOutcome = reconciliation.status === "DISCREPANCY" ? "DISCREPANCY" : "MATCHED";
      let manifestVersion = manifest.version;

      if (manifest.status === "RECONCILING") {
        const bridged = await tx.manifest.update({
          where: { id: manifest.id },
          data: { status: reconciliationOutcome, version: { increment: 1 } },
        });
        manifestVersion = bridged.version;
      }

      if (manifest.status === "RECONCILING" || manifest.status === "MATCHED" || manifest.status === "DISCREPANCY") {
        await closeManifestInTx(tx, tenantId, manifest.id, manifestVersion, userId);
      }
    }
  });

  const updated = await findScopedReconciliation(tenantId, reconciliationId);

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
  expectedVersion: number,
  userId: string | null
) {
  const reconciliation = await findScopedReconciliation(tenantId, reconciliationId);

  if (reconciliation.status !== "DISCREPANCY") {
    throw new BadRequestError("Can only spawn follow-up tasks from DISCREPANCY status");
  }

  const versionResult = await prisma.receivingReconciliation.updateMany({
    where: { id: reconciliationId, version: expectedVersion },
    data: { version: { increment: 1 } },
  });
  if (versionResult.count === 0) {
    throw new ConflictError(
      `Reconciliation was modified by someone else (expected version ${expectedVersion})`
    );
  }

  const item = await prisma.manifestItem.findFirst({
    where: { id: input.itemId, manifestId: reconciliation.manifestId, tenantId },
  });
  if (!item) throw new NotFoundError("Manifest item not found");

  const taskTypeConfig = await prisma.taskTypeConfig.findFirst({
    where: { id: input.taskTypeId, tenantId },
  });
  if (!taskTypeConfig) throw new BadRequestError("Task type not found");

  const manifest = await prisma.manifest.findUniqueOrThrow({
    where: { id: reconciliation.manifestId },
  });

  const { exception, task } = await prisma.$transaction(async (tx) => {
    // Create follow-up exception
    const exception = await tx.taskException.create({
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

    // Create follow-up task. tripId (a real FK to Trip) carries the trip
    // context -- customerId is FK'd to Customer and must not be set to a
    // Trip id.
    const task = await tx.task.create({
      data: {
        tenantId,
        taskNumber: `TASK-${Date.now()}`,
        taskTypeId: input.taskTypeId,
        tripId: manifest.tripId,
        facilityId: reconciliation.destinationFacilityId,
        status: "UNASSIGNED",
        priority: "HIGH",
        notes: `Follow-up for discrepancy: ${item.identifier || item.id}`,
        createdById: userId ?? undefined,
      },
    });

    await tx.taskException.update({
      where: { id: exception.id },
      data: { followUpTaskId: task.id },
    });

    return { exception, task };
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
