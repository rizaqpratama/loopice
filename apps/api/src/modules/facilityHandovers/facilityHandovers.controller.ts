import { Request, Response } from "express";
import {
  createHandoverSchema,
  acceptHandoverSchema,
  rejectHandoverSchema,
} from "@loopice/shared";
import * as service from "./facilityHandovers.service";

const tenantId = (req: Request): string => req.user?.tenantId as string;
const userId = (req: Request): string | null => req.user?.userId ?? null;
const userRole = (req: Request): string | undefined => req.user?.role;

export async function list(req: Request, res: Response) {
  const tripId = req.query.tripId as string | undefined;
  const manifestId = req.query.manifestId as string | undefined;
  const status = req.query.status as string | undefined;
  const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
  const take = req.query.take ? parseInt(req.query.take as string) : 50;

  const handovers = await service.listHandovers(tenantId(req), {
    tripId,
    manifestId,
    status,
    skip,
    take,
  });

  res.json(handovers);
}

export async function create(req: Request, res: Response) {
  const input = createHandoverSchema.parse(req.body);

  const handover = await service.createHandover(tenantId(req), input, userId(req));

  res.status(201).json(handover);
}

export async function get(req: Request, res: Response) {
  const { id } = req.params;

  const handover = await service.getHandover(tenantId(req), id);

  res.json(handover);
}

export async function accept(req: Request, res: Response) {
  const { id } = req.params;
  const { expectedVersion, ...input } = acceptHandoverSchema.parse(req.body);

  const handover = await service.acceptHandover(
    tenantId(req),
    id,
    input,
    expectedVersion,
    userRole(req),
    userId(req) ?? undefined
  );

  res.json(handover);
}

export async function reject(req: Request, res: Response) {
  const { id } = req.params;
  const { expectedVersion } = rejectHandoverSchema.parse(req.body);

  const handover = await service.rejectHandover(tenantId(req), id, expectedVersion, userId(req));

  res.json(handover);
}
