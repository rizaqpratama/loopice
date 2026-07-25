import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as routePlansService from "./routePlans.service";
import {
  createRouteSchema,
  createRouteStopSchema,
  reorderSequenceSchema,
  updateRouteSchema,
} from "./routePlans.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search } = req.query;
  res.json(await routePlansService.listRoutes(tenantId(req), typeof search === "string" ? search : undefined));
}

export async function create(req: Request, res: Response) {
  const input = createRouteSchema.parse(req.body);
  res.status(201).json(await routePlansService.createRoute(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await routePlansService.getRoute(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateRouteSchema.parse(req.body);
  res.json(await routePlansService.updateRoute(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await routePlansService.deactivateRoute(tenantId(req), req.params.id));
}

export async function createStop(req: Request, res: Response) {
  const input = createRouteStopSchema.parse(req.body);
  res.status(201).json(await routePlansService.createRouteStop(tenantId(req), req.params.id, input));
}

export async function deleteStop(req: Request, res: Response) {
  await routePlansService.deleteRouteStop(tenantId(req), req.params.id);
  res.status(204).send();
}

export async function reorderSequence(req: Request, res: Response) {
  const { taskIds } = reorderSequenceSchema.parse(req.body);
  res.json(await routePlansService.reorderTaskSequence(tenantId(req), req.params.id, taskIds));
}
