import type { VehicleStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as vehiclesService from "./vehicles.service";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search, status } = req.query;
  res.json(
    await vehiclesService.listVehicles(tenantId(req), {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as VehicleStatus) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createVehicleSchema.parse(req.body);
  res.status(201).json(await vehiclesService.createVehicle(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await vehiclesService.getVehicle(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateVehicleSchema.parse(req.body);
  res.json(await vehiclesService.updateVehicle(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await vehiclesService.deactivateVehicle(tenantId(req), req.params.id));
}
