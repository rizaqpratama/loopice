import type { TenantBranding } from "@loopice/shared";
import type { Tenant } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/httpError";

function toBranding(tenant: Tenant): TenantBranding {
  return {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
  };
}

export async function getBranding(tenantId: string): Promise<TenantBranding> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError("Tenant not found");
  return toBranding(tenant);
}

export interface UpdateTenantInput {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput
): Promise<TenantBranding> {
  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: input });
  return toBranding(tenant);
}
