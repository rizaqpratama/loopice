import type { Request, Response } from "express";
import { BadRequestError } from "../../lib/httpError";
import * as taskExceptionsService from "./taskExceptions.service";
import { updateExceptionSchema } from "./taskExceptions.schema";

function tenantId(req: Request): string {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  return req.tenant.id;
}

export async function get(req: Request, res: Response) {
  res.json(await taskExceptionsService.getException(tenantId(req), req.params.id));
}

export async function update(req: Request, res: Response) {
  const input = updateExceptionSchema.parse(req.body);
  res.json(
    await taskExceptionsService.updateException(tenantId(req), req.params.id, input, req.user?.userId ?? null)
  );
}
