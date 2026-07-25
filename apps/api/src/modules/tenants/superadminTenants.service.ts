import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/httpError";

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface UpdateTenantInput {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  isActive?: boolean;
}

export async function listTenants() {
  return prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createTenant(input: CreateTenantInput) {
  const existing = await prisma.tenant.findUnique({ where: { subdomain: input.subdomain } });
  if (existing) throw new ConflictError("Subdomain already in use");
  return prisma.tenant.create({ data: input });
}

export async function getTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  return tenant;
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  await getTenant(id);
  return prisma.tenant.update({ where: { id }, data: input });
}

export async function deactivateTenant(id: string) {
  await getTenant(id);
  return prisma.tenant.update({ where: { id }, data: { isActive: false } });
}
