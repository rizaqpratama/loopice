import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/httpError";

export async function listPartners(tenantId: string, search?: string) {
  return prisma.partner.findMany({
    where: {
      tenantId,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });
}

export interface PartnerInput {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  type?: string;
  notes?: string;
}

export async function createPartner(tenantId: string, input: PartnerInput) {
  return prisma.partner.create({ data: { tenantId, ...input } });
}

async function findScoped(tenantId: string, id: string) {
  const partner = await prisma.partner.findFirst({ where: { id, tenantId } });
  if (!partner) throw new NotFoundError("Partner not found");
  return partner;
}

export async function getPartner(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdatePartnerInput extends Partial<PartnerInput> {
  isActive?: boolean;
}

export async function updatePartner(tenantId: string, id: string, input: UpdatePartnerInput) {
  await findScoped(tenantId, id);
  return prisma.partner.update({ where: { id }, data: input });
}

export async function deactivatePartner(tenantId: string, id: string) {
  await findScoped(tenantId, id);
  return prisma.partner.update({ where: { id }, data: { isActive: false } });
}
