import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as stationsService from "./stations.service";
import { createStationSchema, updateStationSchema } from "./stations.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { search } = req.query;
  res.json(
    await stationsService.listStations(tenantId(req), {
      search: typeof search === "string" ? search : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createStationSchema.parse(req.body);
  res.status(201).json(await stationsService.createStation(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await stationsService.getStation(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateStationSchema.parse(req.body);
  res.json(await stationsService.updateStation(tenantId(req), req.params.id, input));
}

export async function deactivate(req: Request, res: Response) {
  res.json(await stationsService.deactivateStation(tenantId(req), req.params.id));
}
