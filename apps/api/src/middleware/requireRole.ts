import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@loopice/shared";
import { ForbiddenError, UnauthorizedError } from "../lib/httpError";

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Requires one of roles: ${allowedRoles.join(", ")}`));
      return;
    }
    next();
  };
}
