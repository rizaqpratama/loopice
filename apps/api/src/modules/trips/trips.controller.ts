import type { TripStatus } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as tripsService from "./trips.service";
import { createTripSchema, updateTripSchema, updateTripStatusSchema } from "./trips.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function list(req: Request, res: Response) {
  const { status, driverId, vehicleId } = req.query;
  res.json(
    await tripsService.listTrips(tenantId(req), {
      status: typeof status === "string" ? (status as TripStatus) : undefined,
      driverId: typeof driverId === "string" ? driverId : undefined,
      vehicleId: typeof vehicleId === "string" ? vehicleId : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createTripSchema.parse(req.body);
  res.status(201).json(await tripsService.createTrip(tenantId(req), input));
}

export async function get(req: Request, res: Response) {
  res.json(await tripsService.getTrip(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTripSchema.parse(req.body);
  res.json(await tripsService.updateTrip(tenantId(req), req.params.id, input));
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = updateTripStatusSchema.parse(req.body);
  res.json(await tripsService.updateTripStatus(tenantId(req), req.params.id, status));
}

export async function addTask(req: Request, res: Response) {
  res.json(await tripsService.addTaskToTrip(tenantId(req), req.params.id, req.params.taskId));
}

export async function removeTask(req: Request, res: Response) {
  res.json(await tripsService.removeTaskFromTrip(tenantId(req), req.params.id, req.params.taskId));
}
