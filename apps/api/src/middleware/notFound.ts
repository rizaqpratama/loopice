import type { NextFunction, Request, Response } from "express";

export function notFound(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
