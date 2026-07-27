import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as shipmentLegsService from "./shipmentLegs.service";
import { createShipmentLegSchema, updateShipmentLegStatusSchema } from "./shipmentLegs.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function create(req: Request, res: Response) {
  const input = createShipmentLegSchema.parse(req.body);
  const leg = await shipmentLegsService.createShipmentLeg(
    tenantId(req),
    req.params.serviceOrderId,
    req.user?.userId ?? null,
    input
  );
  res.status(201).json(leg);
}

export async function updateStatus(req: Request, res: Response) {
  const { status, note } = updateShipmentLegStatusSchema.parse(req.body);
  const leg = await shipmentLegsService.updateShipmentLegStatus(
    tenantId(req),
    req.params.id,
    status,
    note,
    req.user?.userId ?? null
  );
  res.json(leg);
}

export async function remove(req: Request, res: Response) {
  await shipmentLegsService.deleteShipmentLeg(tenantId(req), req.params.id);
  res.status(204).send();
}
