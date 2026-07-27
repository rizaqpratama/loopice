import type { DriverStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as driversService from "./drivers.service";
import { createDriverSchema, updateDriverSchema } from "./drivers.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search, status } = req.query;
  res.json(
    await driversService.listDrivers(tenantId(req), {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as DriverStatus) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createDriverSchema.parse(req.body);
  res.status(201).json(await driversService.createDriver(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await driversService.getDriver(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateDriverSchema.parse(req.body);
  res.json(await driversService.updateDriver(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await driversService.deactivateDriver(tenantId(req), req.params.id));
}
