import type { Request, Response } from "express";
import * as service from "./superadminTenants.service";
import { createTenantSchema, updateTenantSchema } from "./tenants.schema";

export async function list(_req: Request, res: Response) {
  res.json(await service.listTenants());
}

export async function create(req: Request, res: Response) {
  const input = createTenantSchema.parse(req.body);
  res.status(201).json(await service.createTenant(input));
}

export async function get(req: Request, res: Response) {
  res.json(await service.getTenant(req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTenantSchema.parse(req.body);
  res.json(await service.updateTenant(req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await service.deactivateTenant(req.params.id));
}
