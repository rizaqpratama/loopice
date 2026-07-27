import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

export interface ListCustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listCustomers(tenantId: string, params: ListCustomersParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

  const where = {
    tenantId,
    ...(params.search
      ? { name: { contains: params.search, mode: "insensitive" as const } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page, limit };
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export async function createCustomer(tenantId: string, input: CustomerInput) {
  return prisma.customer.create({ data: { tenantId, ...input } });
}

async function findScoped(tenantId: string, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId },
    include: { serviceOrders: { orderBy: { createdAt: "desc" } } },
  });
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
}

export async function getCustomer(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export async function updateCustomer(tenantId: string, id: string, input: Partial<CustomerInput>) {
  await findScoped(tenantId, id);
  return prisma.customer.update({ where: { id }, data: input });
}

export async function deleteCustomer(tenantId: string, id: string) {
  const customer = await findScoped(tenantId, id);
  if (customer.serviceOrders.length > 0) {
    throw new BadRequestError("Cannot delete a customer with existing service orders");
  }
  await prisma.customer.delete({ where: { id } });
}
