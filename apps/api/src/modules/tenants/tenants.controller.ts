import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as tenantsService from "./tenants.service";
import { updateTenantSchema } from "./tenants.schema";

export async function branding(req: Request, res: Response) {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  res.json(await tenantsService.getBranding(req.tenant.id));
}

export async function me(req: Request, res: Response) {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  res.json(await tenantsService.getBranding(req.tenant.id));
}

export async function updateMe(req: Request, res: Response) {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  const input = updateTenantSchema.parse(req.body);
  const { isActive, ...rest } = input;
  res.json(await tenantsService.updateTenant(req.tenant.id, rest));
}
