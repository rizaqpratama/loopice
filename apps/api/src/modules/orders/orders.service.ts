import { canTransitionOrderStatus, type OrderStatus } from "@loopice/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, NotFoundError } from "../../lib/httpError";

const ORDER_INCLUDE = {
  customer: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

export interface ListOrdersParams {
  status?: OrderStatus;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function listOrders(tenantId: string, params: ListOrdersParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;

  const where: Prisma.OrderWhereInput = {
    tenantId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.search
      ? {
          OR: [
            { orderNumber: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, limit };
}

export interface CreateOrderInput {
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

async function generateOrderNumber(tenantId: string): Promise<string> {
  const count = await prisma.order.count({ where: { tenantId } });
  return `ORD-${String(count + 1).padStart(6, "0")}`;
}

export async function createOrder(
  tenantId: string,
  createdById: string | null,
  input: CreateOrderInput
) {
  await assertCustomerInTenant(tenantId, input.customerId);

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const orderNumber = await generateOrderNumber(tenantId);
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            tenantId,
            orderNumber,
            customerId: input.customerId,
            description: input.description,
            originAddress: input.originAddress,
            destAddress: input.destAddress,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
            createdById: createdById ?? undefined,
            status: "PENDING",
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "PENDING",
            changedById: createdById ?? undefined,
          },
        });
        // Re-fetch with the include so the just-created status history row
        // (inserted after `order` above) is present in the response.
        return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
      });
    } catch (err) {
      const isUniqueClash =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isUniqueClash || attempt === MAX_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique order number");
}

async function findScoped(tenantId: string, id: string) {
  const order = await prisma.order.findFirst({
    where: { id, tenantId },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

export async function getOrder(tenantId: string, id: string) {
  return findScoped(tenantId, id);
}

export interface UpdateOrderInput {
  description?: string;
  originAddress?: string;
  destAddress?: string;
  scheduledAt?: string | null;
}

export async function updateOrder(tenantId: string, id: string, input: UpdateOrderInput) {
  await findScoped(tenantId, id);
  return prisma.order.update({
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
    include: ORDER_INCLUDE,
  });
}

export async function updateOrderStatus(
  tenantId: string,
  id: string,
  status: OrderStatus,
  note: string | undefined,
  changedById: string | null
) {
  const order = await findScoped(tenantId, id);

  if (order.status !== status && !canTransitionOrderStatus(order.status, status)) {
    throw new BadRequestError(`Cannot transition order from ${order.status} to ${status}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status } });
    await tx.orderStatusHistory.create({
      data: { orderId: id, status, note, changedById: changedById ?? undefined },
    });
    // Re-fetch with the include so the just-created status history row is present.
    return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
  });
}
