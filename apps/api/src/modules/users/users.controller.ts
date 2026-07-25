import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as usersService from "./users.service";
import { createUserSchema, updateUserSchema } from "./users.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  res.json(await usersService.listUsers(tenantId(req)));
}

export async function create(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  res.status(201).json(await usersService.createUser(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await usersService.getUser(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  res.json(await usersService.updateUser(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await usersService.deactivateUser(tenantId(req), req.params.id));
}
