import type { AuthUser, LoginResponse } from "@loopice/shared";
import type { User } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, UnauthorizedError } from "../../lib/httpError";
import { signToken } from "../../lib/jwt";
import { comparePassword, hashPassword } from "../../lib/password";

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Bootstraps a tenant's first admin (or adds a dispatcher if an admin already
 * exists). Not linked from the web UI in phase 1 -- used by seed/tests, since
 * ongoing user creation is admin-driven via the users module.
 */
export async function register(tenantId: string, input: RegisterInput): Promise<AuthUser> {
  const existingCount = await prisma.user.count({ where: { tenantId } });
  const role = existingCount === 0 ? "TENANT_ADMIN" : "DISPATCHER";

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: input.email } },
  });
  if (existing) throw new ConflictError("A user with this email already exists in this tenant");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role,
    },
  });

  return toAuthUser(user);
}

export async function login(
  tenantId: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (!user || !user.isActive) throw new UnauthorizedError("Invalid email or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ userId: user.id, tenantId: user.tenantId, role: user.role });
  return { token, user: toAuthUser(user) };
}

export async function superadminLogin(email: string, password: string): Promise<LoginResponse> {
  const user = await prisma.user.findFirst({
    where: { email, role: "SUPERADMIN", tenantId: null },
  });
  if (!user || !user.isActive) throw new UnauthorizedError("Invalid email or password");

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ userId: user.id, tenantId: null, role: user.role });
  return { token, user: toAuthUser(user) };
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new UnauthorizedError("User not found or inactive");
  return toAuthUser(user);
}
