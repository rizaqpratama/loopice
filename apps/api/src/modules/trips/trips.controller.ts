import type { TripStatus, TripType, TransferType } from "@loopice/shared";
import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as tripsService from "./trips.service";
import {
  createTripSchema,
  updateTripSchema,
  updateTripStatusSchema,
  assignVehicleSchema,
  assignDriverSchema,
  addSecondaryDriverSchema,
  createReplacementTripSchema,
} from "@loopice/shared";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

function userId(req: Request): string | null {
  return req.user?.userId ?? null;
}

export async function list(req: Request, res: Response) {
  const {
    status,
    tripType,
    transferType,
    driverId,
    vehicleId,
    originFacilityId,
    destinationFacilityId,
    facilityId,
    serviceDate,
    skip,
    take,
  } = req.query;

  res.json(
    await tripsService.listTrips(tenantId(req), {
      status: typeof status === "string" ? (status as TripStatus) : undefined,
      tripType: typeof tripType === "string" ? (tripType as TripType) : undefined,
      transferType: typeof transferType === "string" ? (transferType as TransferType) : undefined,
      driverId: typeof driverId === "string" ? driverId : undefined,
      vehicleId: typeof vehicleId === "string" ? vehicleId : undefined,
      originFacilityId: typeof originFacilityId === "string" ? originFacilityId : undefined,
      destinationFacilityId:
        typeof destinationFacilityId === "string" ? destinationFacilityId : undefined,
      facilityId: typeof facilityId === "string" ? facilityId : undefined,
      serviceDate: typeof serviceDate === "string" ? serviceDate : undefined,
      skip: typeof skip === "string" ? parseInt(skip, 10) : undefined,
      take: typeof take === "string" ? parseInt(take, 10) : undefined,
    })
  );
}

export async function create(req: Request, res: Response) {
  const input = createTripSchema.parse(req.body);
  res.status(201).json(await tripsService.createTrip(tenantId(req), input, userId(req)));
}

export async function get(req: Request, res: Response) {
  res.json(await tripsService.getTrip(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateTripSchema.parse(req.body);
  const { expectedVersion, ...data } = input;
  res.json(
    await tripsService.updateTrip(tenantId(req), req.params.id, data, expectedVersion, userId(req))
  );
}

export async function updateStatus(req: Request, res: Response) {
  const { status, note, expectedVersion, clientRequestId } =
    updateTripStatusSchema.parse(req.body);
  res.json(
    await tripsService.updateTripStatus(
      tenantId(req),
      req.params.id,
      status,
      note,
      expectedVersion,
      userId(req),
      clientRequestId
    )
  );
}

export async function assignVehicle(req: Request, res: Response) {
  const { vehicleId, expectedVersion } = assignVehicleSchema.parse(req.body);
  res.json(
    await tripsService.assignVehicle(tenantId(req), req.params.id, vehicleId, expectedVersion, userId(req))
  );
}

export async function unassignVehicle(req: Request, res: Response) {
  const { expectedVersion } = assignVehicleSchema.parse(req.body);
  res.json(
    await tripsService.unassignVehicle(tenantId(req), req.params.id, expectedVersion, userId(req))
  );
}

export async function assignDriver(req: Request, res: Response) {
  const { driverId, expectedVersion } = assignDriverSchema.parse(req.body);
  res.json(
    await tripsService.assignPrimaryDriver(
      tenantId(req),
      req.params.id,
      driverId,
      expectedVersion,
      userId(req)
    )
  );
}

export async function unassignDriver(req: Request, res: Response) {
  const { expectedVersion } = assignDriverSchema.parse(req.body);
  res.json(
    await tripsService.unassignPrimaryDriver(tenantId(req), req.params.id, expectedVersion, userId(req))
  );
}

export async function addSecondaryDriver(req: Request, res: Response) {
  const { driverId } = addSecondaryDriverSchema.parse(req.body);
  res.json(
    await tripsService.addSecondaryDriver(tenantId(req), req.params.id, driverId, userId(req))
  );
}

export async function removeSecondaryDriver(req: Request, res: Response) {
  res.json(
    await tripsService.removeSecondaryDriver(
      tenantId(req),
      req.params.id,
      req.params.driverId,
      userId(req)
    )
  );
}

export async function addTask(req: Request, res: Response) {
  const { stopId } = req.body;
  res.json(
    await tripsService.addTaskToTrip(
      tenantId(req),
      req.params.id,
      req.params.taskId,
      stopId ?? null,
      userId(req)
    )
  );
}

export async function removeTask(req: Request, res: Response) {
  res.json(
    await tripsService.removeTaskFromTrip(
      tenantId(req),
      req.params.id,
      req.params.taskId,
      userId(req)
    )
  );
}

export async function getDispatchChecklist(req: Request, res: Response) {
  res.json(await tripsService.getDispatchChecklist(tenantId(req), req.params.id));
}

export async function pause(req: Request, res: Response) {
  const { expectedVersion } = updateTripStatusSchema.parse(req.body);
  res.json(
    await tripsService.pauseTrip(tenantId(req), req.params.id, expectedVersion, userId(req))
  );
}

export async function resume(req: Request, res: Response) {
  const { expectedVersion } = updateTripStatusSchema.parse(req.body);
  res.json(
    await tripsService.resumeTrip(tenantId(req), req.params.id, expectedVersion, userId(req))
  );
}

export async function createReplacement(req: Request, res: Response) {
  const input = createReplacementTripSchema.parse(req.body);
  res.status(201).json(
    await tripsService.createReplacementTrip(
      tenantId(req),
      req.params.id,
      input,
      userId(req)
    )
  );
}
