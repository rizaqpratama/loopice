import type { AuthUser, UserRole } from "@loopice/shared";
import type { User } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/httpError";
import { hashPassword } from "../../lib/password";

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

export async function listUsers(tenantId: string) {
  const users = await prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  return users.map(toAuthUser);
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export async function createUser(tenantId: string, input: CreateUserInput) {
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
      role: input.role,
    },
  });
  return toAuthUser(user);
}

async function findScoped(tenantId: string, id: string) {
  const user = await prisma.user.findFirst({ where: { id, tenantId } });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function getUser(tenantId: string, id: string) {
  return toAuthUser(await findScoped(tenantId, id));
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export async function updateUser(tenantId: string, id: string, input: UpdateUserInput) {
  await findScoped(tenantId, id);
  const user = await prisma.user.update({ where: { id }, data: input });
  return toAuthUser(user);
}

export async function deactivateUser(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
  return toAuthUser(user);
}
