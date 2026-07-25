import { canTransitionServiceOrderStatus, type ServiceOrderStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

const SERVICE_ORDER_INCLUDE = {
  customer: true,
  shipments: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
} satisfies Prisma.ServiceOrderInclude;

export interface ListServiceOrdersParams {
  status?: ServiceOrderStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listServiceOrders(tenantId: string, params: ListServiceOrdersParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

  const where: Prisma.ServiceOrderWhereInput = {
    tenantId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.search
      ? {
          OR: [
            { soNumber: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      include: SERVICE_ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.serviceOrder.count({ where }),
  ]);

  return { items, total, page, limit };
}

export interface CreateServiceOrderInput {
  customerId: string;
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string;
}

async function assertCustomerInTenant(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) throw new BadRequestError("Customer does not belong to this tenant");
}

async function generateSoNumber(tenantId: string): Promise<string> {
  const count = await prisma.serviceOrder.count({ where: { tenantId } });
  return `SO-${String(count + 1).padStart(6, "0")}`;
}

export async function createServiceOrder(
  tenantId: string,
  createdById: string | null,
  input: CreateServiceOrderInput
) {
  await assertCustomerInTenant(tenantId, input.customerId);

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const soNumber = await generateSoNumber(tenantId);
    try {
      return await prisma.$transaction(async (tx) => {
        const serviceOrder = await tx.serviceOrder.create({
          data: {
            tenantId,
            soNumber,
            customerId: input.customerId,
            description: input.description,
            originAddress: input.originAddress,
            destAddress: input.destAddress,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
            createdById: createdById ?? undefined,
            status: "DRAFT",
          },
        });
        await tx.serviceOrderStatusHistory.create({
          data: {
            serviceOrderId: serviceOrder.id,
            status: "DRAFT",
            changedById: createdById ?? undefined,
          },
        });
        // Re-fetch with the include so the just-created status history row
        // (inserted after `serviceOrder` above) is present in the response.
        return tx.serviceOrder.findUniqueOrThrow({
          where: { id: serviceOrder.id },
          include: SERVICE_ORDER_INCLUDE,
        });
      });
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique SO number");
}

async function findScoped(tenantId: string, id: string) {
  const serviceOrder = await prisma.serviceOrder.findFirst({
    where: { id, tenantId },
    include: SERVICE_ORDER_INCLUDE,
  });
  if (!serviceOrder) throw new NotFoundError("Service order not found");
  return serviceOrder;
}

export async function getServiceOrder(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateServiceOrderInput {
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string | null;
}

export async function updateServiceOrder(
  tenantId: string,
  id: string,
  input: UpdateServiceOrderInput
) {
  await findScoped(tenantId, id);
  return prisma.serviceOrder.update({
    where: { id },
    data: {
      description: input.description,
      originAddress: input.originAddress,
      destAddress: input.destAddress,
      scheduledAt:
        input.scheduledAt === undefined
          ? undefined
          : input.scheduledAt === null
            ? null
            : new Date(input.scheduledAt),
    },
    include: SERVICE_ORDER_INCLUDE,
  });
}

export async function updateServiceOrderStatus(
  tenantId: string,
  id: string,
  status: ServiceOrderStatus,
  note: string | undefined,
  changedById: string | null
) {
  const serviceOrder = await findScoped(tenantId, id);

  if (
    serviceOrder.status !== status &&
    !canTransitionServiceOrderStatus(serviceOrder.status, status)
  ) {
    throw new BadRequestError(
      `Cannot transition service order from ${serviceOrder.status} to ${status}`
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.serviceOrder.update({ where: { id }, data: { status } });
    await tx.serviceOrderStatusHistory.create({
      data: { serviceOrderId: id, status, note, changedById: changedById ?? undefined },
    });
    // Re-fetch with the include so the just-created status history row is present.
    return tx.serviceOrder.findUniqueOrThrow({ where: { id }, include: SERVICE_ORDER_INCLUDE });
  });
}
