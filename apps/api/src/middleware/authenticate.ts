import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";
import { ForbiddenError, UnauthorizedError } from "../lib/httpError";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing bearer token");
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);

    if (req.tenant && payload.tenantId !== req.tenant.id) {
      throw new ForbiddenError("Token does not belong to this tenant");
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      next(err);
    } else {
      next(new UnauthorizedError("Invalid or expired token"));
    }
  }
}
