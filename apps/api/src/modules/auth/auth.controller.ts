import type { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../../lib/httpError";
import * as authService from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";

export async function register(req: Request, res: Response) {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  const input = registerSchema.parse(req.body);
  const user = await authService.register(req.tenant.id, input);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  if (!req.tenant) throw new BadRequestError("Tenant could not be resolved");
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(req.tenant.id, email, password);
  res.json(result);
}

export async function superadminLogin(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.superadminLogin(email, password);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new UnauthorizedError();
  const user = await authService.getMe(req.user.userId);
  res.json({ user });
}
