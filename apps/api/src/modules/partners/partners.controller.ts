import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as partnersService from "./partners.service";
import { createPartnerSchema, updatePartnerSchema } from "./partners.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search } = req.query;
  res.json(await partnersService.listPartners(tenantId(req), typeof search === "string" ? search : undefined));
}

export async function create(req: Request, res: Response) {
  const input = createPartnerSchema.parse(req.body);
  res.status(201).json(await partnersService.createPartner(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await partnersService.getPartner(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updatePartnerSchema.parse(req.body);
  res.json(await partnersService.updatePartner(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await partnersService.deactivatePartner(tenantId(req), req.params.id));
}
