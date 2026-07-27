import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as shipmentsService from "./shipments.service";
import { createShipmentSchema, updateShipmentSchema } from "./shipments.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function create(req: Request, res: Response) {
  const input = createShipmentSchema.parse(req.body);
  const shipment = await shipmentsService.createShipment(
    tenantId(req),
    req.params.serviceOrderId,
    input
  );
  res.status(201).json(shipment);
}

export async function update(req: Request, res: Response) {
  const input = updateShipmentSchema.parse(req.body);
  res.json(await shipmentsService.updateShipment(tenantId(req), req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await shipmentsService.deleteShipment(tenantId(req), req.params.id);
  res.status(204).send();
}
