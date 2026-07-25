import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as customersService from "./customers.service";
import { createCustomerSchema, updateCustomerSchema } from "./customers.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search, page, limit } = req.query;
  res.json(
    await customersService.listCustomers(tenantId(req), {
      search: typeof search === "string" ? search : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  res.status(201).json(await customersService.createCustomer(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await customersService.getCustomer(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateCustomerSchema.parse(req.body);
  res.json(await customersService.updateCustomer(tenantId(req), req.params.id, input));
}

export async function remove(req: Request, res: Response) {
  await customersService.deleteCustomer(tenantId(req), req.params.id);
  res.status(204).send();
}
