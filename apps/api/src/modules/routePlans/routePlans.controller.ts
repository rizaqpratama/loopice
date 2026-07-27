import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as routePlansService from "./routePlans.service";
import {
  createRouteSchema,
  updateRouteSchema,
  updateRouteStatusSchema,
  createRouteStopSchema,
  updateRouteStopSchema,
  deleteRouteStopSchema,
  linkTaskToStopSchema,
  activateRouteVersionSchema,
} from "@loopice/shared";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

function userId(req: Request): string | null {
  return req.user?.userId ?? null;
}

export async function list(req: Request, res: Response) {
  const { search, status, tripId, isTemplate, skip, take } = req.query;
  res.json(
    await routePlansService.listRoutes(tenantId(req), {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? (status as any) : undefined,
      tripId: typeof tripId === "string" ? tripId : undefined,
      isTemplate: typeof isTemplate === "string" ? isTemplate === "true" : undefined,
      skip: typeof skip === "string" ? parseInt(skip, 10) : undefined,
      take: typeof take === "string" ? parseInt(take, 10) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createRouteSchema.parse(req.body);
  res.status(201).json(await routePlansService.createRoute(tenantId(req), input, userId(req)));
}

export async function get(req: Request, res: Response) {
  res.json(await routePlansService.getRoute(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateRouteSchema.parse(req.body);
  const { expectedVersion, ...data } = input;
  res.json(
    await routePlansService.updateRoute(
      tenantId(req),
      req.params.id,
      data,
      expectedVersion,
      userId(req)
    )
  );
}

export async function updateStatus(req: Request, res: Response) {
  const { status, expectedVersion } = updateRouteStatusSchema.parse(req.body);
  res.json(
    await routePlansService.updateRouteStatus(
      tenantId(req),
      req.params.id,
      status,
      expectedVersion,
      userId(req)
    )
  );
}

export async function createVersion(req: Request, res: Response) {
  const { changeReason } = req.body;
  res.status(201).json(
    await routePlansService.createRouteVersion(tenantId(req), req.params.id, { changeReason }, userId(req))
  );
}

export async function activateVersion(req: Request, res: Response) {
  const { expectedVersion } = activateRouteVersionSchema.parse(req.body);
  res.json(
    await routePlansService.activateRouteVersion(
      tenantId(req),
      req.params.id,
      expectedVersion,
      userId(req)
    )
  );
}

export async function addStop(req: Request, res: Response) {
  const { expectedVersion, ...input } = createRouteStopSchema.parse(req.body);
  res.status(201).json(
    await routePlansService.addRouteStop(
      tenantId(req),
      req.params.id,
      input,
      expectedVersion,
      userId(req)
    )
  );
}

export async function getStop(req: Request, res: Response) {
  res.json(await routePlansService.getRouteStop(tenantId(req), req.params.stopId));
}

export async function updateStop(req: Request, res: Response) {
  const { expectedVersion, ...input } = updateRouteStopSchema.parse(req.body);
  res.json(
    await routePlansService.updateRouteStop(
      tenantId(req),
      req.params.stopId,
      input,
      expectedVersion,
      userId(req)
    )
  );
}

export async function updateStopStatus(req: Request, res: Response) {
  const { status } = req.body;
  res.json(
    await routePlansService.updateRouteStopStatus(
      tenantId(req),
      req.params.stopId,
      status,
      userId(req),
      req.user?.role
    )
  );
}

export async function reorderStops(req: Request, res: Response) {
  const { stopIds } = req.body;
  res.json(
    await routePlansService.reorderRouteStops(tenantId(req), req.params.id, { stopIds }, userId(req))
  );
}

export async function deleteStop(req: Request, res: Response) {
  const { expectedVersion } = deleteRouteStopSchema.parse(req.body);
  await routePlansService.deleteRouteStop(
    tenantId(req),
    req.params.stopId,
    expectedVersion,
    userId(req)
  );
  res.status(204).send();
}

export async function linkTask(req: Request, res: Response) {
  const { expectedVersion } = linkTaskToStopSchema.parse(req.body);
  res.json(
    await routePlansService.linkTaskToStop(
      tenantId(req),
      req.params.stopId,
      req.params.taskId,
      expectedVersion,
      userId(req)
    )
  );
}

export async function unlinkTask(req: Request, res: Response) {
  const { expectedVersion } = linkTaskToStopSchema.parse(req.body);
  res.json(
    await routePlansService.unlinkTaskFromStop(
      tenantId(req),
      req.params.stopId,
      req.params.taskId,
      expectedVersion,
      userId(req)
    )
  );
}

export async function getVersions(req: Request, res: Response) {
  res.json(await routePlansService.getRouteVersions(tenantId(req), req.params.id));
}

export async function compareVersions(req: Request, res: Response) {
  const { fromId, toId } = req.query;
  if (typeof fromId !== "string" || typeof toId !== "string") {
    throw new BadRequestError("fromId and toId are required");
  }
  res.json(await routePlansService.compareRoutes(tenantId(req), fromId, toId));
}
