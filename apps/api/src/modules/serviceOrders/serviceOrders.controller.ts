import type { ServiceOrderStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as serviceOrdersService from "./serviceOrders.service";
import {
  createServiceOrderSchema,
  updateServiceOrderSchema,
  updateServiceOrderStatusSchema,
} from "./serviceOrders.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { status, customerId, search, page, limit } = req.query;
  res.json(
    await serviceOrdersService.listServiceOrders(tenantId(req), {
      status: typeof status === "string" ? (status as ServiceOrderStatus) : undefined,
      customerId: typeof customerId === "string" ? customerId : undefined,
      search: typeof search === "string" ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createServiceOrderSchema.parse(req.body);
  const serviceOrder = await serviceOrdersService.createServiceOrder(
    tenantId(req),
    req.user?.userId ?? null,
    input
  );
  res.status(201).json(serviceOrder);
}

export async function get(req: Request, res: Response) {
  res.json(await serviceOrdersService.getServiceOrder(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateServiceOrderSchema.parse(req.body);
  res.json(await serviceOrdersService.updateServiceOrder(tenantId(req), req.params.id, input));
}

export async function updateStatus(req: Request, res: Response) {
  const { status, note } = updateServiceOrderStatusSchema.parse(req.body);
  const serviceOrder = await serviceOrdersService.updateServiceOrderStatus(
    tenantId(req),
    req.params.id,
    status,
    note,
    req.user?.userId ?? null
  );
  res.json(serviceOrder);
}
