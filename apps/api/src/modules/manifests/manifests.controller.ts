import { Request, Response } from "express";
import {
  createManifestSchema,
  addManifestItemSchema,
  updateManifestItemLoadingSchema,
  updateManifestItemReceivingSchema,
  sealManifestSchema,
} from "@loopice/shared";
import * as service from "./manifests.service";

const tenantId = (req: Request): string => req.user?.tenantId as string;
const userId = (req: Request): string | null => req.user?.userId ?? null;

export async function list(req: Request, res: Response) {
  const tripId = req.query.tripId as string | undefined;
  const status = req.query.status as string | undefined;
  const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
  const take = req.query.take ? parseInt(req.query.take as string) : 50;

  const manifests = await service.listManifests(tenantId(req), {
    tripId,
    status: status as any,
    skip,
    take,
  });

  res.json(manifests);
}

export async function create(req: Request, res: Response) {
  const input = createManifestSchema.parse(req.body);

  const manifest = await service.createManifest(tenantId(req), input, userId(req));

  res.status(201).json(manifest);
}

export async function get(req: Request, res: Response) {
  const { id } = req.params;

  const manifest = await service.getManifest(tenantId(req), id);

  res.json(manifest);
}

export async function addItem(req: Request, res: Response) {
  const { id: manifestId } = req.params;
  const input = addManifestItemSchema.parse(req.body);

  const item = await service.addManifestItem(tenantId(req), manifestId, input, userId(req));

  res.status(201).json(item);
}

export async function updateItemLoading(req: Request, res: Response) {
  const { id: manifestId, itemId } = req.params;
  const { loadingStatus, expectedVersion } = updateManifestItemLoadingSchema.parse(req.body);

  const item = await service.updateManifestItemLoading(
    tenantId(req),
    manifestId,
    itemId,
    loadingStatus,
    expectedVersion,
    userId(req)
  );

  res.json(item);
}

export async function updateItemReceiving(req: Request, res: Response) {
  const { id: manifestId, itemId } = req.params;
  const { receivingStatus, expectedVersion } = updateManifestItemReceivingSchema.parse(req.body);

  const item = await service.updateManifestItemReceiving(
    tenantId(req),
    manifestId,
    itemId,
    receivingStatus,
    expectedVersion,
    userId(req)
  );

  res.json(item);
}

export async function deleteItem(req: Request, res: Response) {
  const { id: manifestId, itemId } = req.params;

  await service.deleteManifestItem(tenantId(req), manifestId, itemId);

  res.status(204).send();
}

export async function seal(req: Request, res: Response) {
  const { id: manifestId } = req.params;
  const { sealNumber, expectedVersion } = sealManifestSchema.parse(req.body);

  const manifest = await service.sealManifest(
    tenantId(req),
    manifestId,
    sealNumber,
    expectedVersion,
    userId(req)
  );

  res.json(manifest);
}

export async function getDispatchChecklist(req: Request, res: Response) {
  const { tripId } = req.params;

  const checklist = await service.getDispatchChecklist(tenantId(req), tripId);

  res.json(checklist);
}

export async function dispatch(req: Request, res: Response) {
  const { tripId } = req.params;
  const { expectedVersion } = req.body;

  const trip = await service.dispatchTrip(tenantId(req), tripId, expectedVersion, userId(req));

  res.json(trip);
}
