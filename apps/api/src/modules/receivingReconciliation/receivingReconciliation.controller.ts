import { Request, Response } from "express";
import { z } from "zod";
import {
  startReconciliationSchema,
  recordReconciliationCountsSchema,
  completeReconciliationSchema,
  spawnDiscrepancyTaskSchema,
} from "@loopice/shared";
import * as service from "./receivingReconciliation.service";

function userId(req: Request): string | null {
  return req.user?.userId ?? null;
}

export async function list(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;
  const tripId = req.query.tripId as string | undefined;
  const manifestId = req.query.manifestId as string | undefined;
  const status = req.query.status as string | undefined;
  const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
  const take = req.query.take ? parseInt(req.query.take as string) : undefined;

  const reconciliations = await service.listReconciliations(tenantId, {
    tripId,
    manifestId,
    status,
    skip,
    take,
  });

  res.json(reconciliations);
}

export async function get(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;
  const { id } = req.params;

  const reconciliation = await service.getReconciliation(tenantId, id);

  res.json(reconciliation);
}

export async function start(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;

  const input = startReconciliationSchema.parse(req.body);

  const created = await service.startReconciliation(tenantId, input, userId(req));

  res.status(201).json(created);
}

export async function recordCounts(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;
  const { id } = req.params;

  const input = recordReconciliationCountsSchema.parse(req.body);

  const updated = await service.recordReconciliationCounts(
    tenantId,
    id,
    input,
    userId(req)
  );

  res.json(updated);
}

export async function complete(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;
  const { id } = req.params;
  const userRole = req.user?.role;

  const input = completeReconciliationSchema.parse(req.body);

  const updated = await service.completeReconciliation(
    tenantId,
    id,
    userRole,
    userId(req)
  );

  res.json(updated);
}

export async function spawnDiscrepancyTask(req: Request, res: Response) {
  const tenantId = req.user?.tenantId!;
  const { id } = req.params;

  const input = spawnDiscrepancyTaskSchema.parse(req.body);

  const task = await service.spawnDiscrepancyTask(tenantId, id, input, userId(req));

  res.status(201).json(task);
}
