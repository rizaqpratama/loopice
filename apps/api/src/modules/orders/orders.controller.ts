import type { OrderStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as ordersService from "./orders.service";
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from "./orders.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { status, customerId, search, page, limit } = req.query;
  res.json(
    await ordersService.listOrders(tenantId(req), {
      status: typeof status === "string" ? (status as OrderStatus) : undefined,
      customerId: typeof customerId === "string" ? customerId : undefined,
      search: typeof search === "string" ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createOrderSchema.parse(req.body);
  const order = await ordersService.createOrder(tenantId(req), req.user?.userId ?? null, input);
  res.status(201).json(order);
}

export async function get(req: Request, res: Response) {
  res.json(await ordersService.getOrder(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateOrderSchema.parse(req.body);
  res.json(await ordersService.updateOrder(tenantId(req), req.params.id, input));
}

export async function updateStatus(req: Request, res: Response) {
  const { status, note } = updateOrderStatusSchema.parse(req.body);
  const order = await ordersService.updateOrderStatus(
    tenantId(req),
    req.params.id,
    status,
    note,
    req.user?.userId ?? null
  );
  res.json(order);
}
