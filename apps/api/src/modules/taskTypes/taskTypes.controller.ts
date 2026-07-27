import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as taskTypesService from "./taskTypes.service";
import { createTaskTypeConfigSchema, updateTaskTypeConfigSchema } from "./taskTypes.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search } = req.query;
  res.json(await taskTypesService.listTaskTypes(tenantId(req), typeof search === "string" ? search : undefined));
}

export async function create(req: Request, res: Response) {
  const input = createTaskTypeConfigSchema.parse(req.body);
  res.status(201).json(await taskTypesService.createTaskType(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await taskTypesService.getTaskType(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTaskTypeConfigSchema.parse(req.body);
  res.json(await taskTypesService.updateTaskType(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await taskTypesService.deactivateTaskType(tenantId(req), req.params.id));
}
