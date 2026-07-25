import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

async function findOrCreateSuperadmin(passwordHash: string) {
  const existing = await prisma.user.findFirst({
    where: { email: "superadmin@loopice.dev", tenantId: null },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      tenantId: null,
      email: "superadmin@loopice.dev",
      passwordHash,
      firstName: "Platform",
      lastName: "Admin",
      role: "SUPERADMIN",
    },
  });
}

async function findOrCreateCustomer(
  tenantId: string,
  data: { name: string; email: string; phone: string; address: string }
) {
  const existing = await prisma.customer.findFirst({ where: { tenantId, name: data.name } });
  if (existing) return existing;
  return prisma.customer.create({ data: { tenantId, ...data } });
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await findOrCreateSuperadmin(passwordHash);

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "acme" },
    update: {},
    create: {
      name: "Acme Logistics",
      subdomain: "acme",
      logoUrl: "https://placehold.co/128x128?text=Acme",
      primaryColor: "#4F46E5",
      secondaryColor: "#1E293B",
    },
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@acme.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@acme.test",
      passwordHash,
      firstName: "Alice",
      lastName: "Admin",
      role: "TENANT_ADMIN",
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "dispatcher@acme.test" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "dispatcher@acme.test",
      passwordHash,
      firstName: "Dan",
      lastName: "Dispatcher",
      role: "DISPATCHER",
    },
  });

  const customerSeeds = [
    { name: "Warung Sumber Rejeki", email: "sumberrejeki@example.com", phone: "081200000001", address: "Jl. Merdeka 1, Jakarta" },
    { name: "Toko Elektronik Jaya", email: "elektronikjaya@example.com", phone: "081200000002", address: "Jl. Sudirman 45, Bandung" },
    { name: "PT Maju Bersama", email: "majubersama@example.com", phone: "081200000003", address: "Jl. Gatot Subroto 12, Surabaya" },
    { name: "CV Sentosa Abadi", email: "sentosaabadi@example.com", phone: "081200000004", address: "Jl. Diponegoro 8, Semarang" },
  ];

  const customers = [];
  for (const seed of customerSeeds) {
    customers.push(await findOrCreateCustomer(tenant.id, seed));
  }

  const existingOrders = await prisma.order.count({ where: { tenantId: tenant.id } });
  if (existingOrders === 0) {
    const finalStatuses = ["PENDING", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;
    const lifecycleSteps: Record<(typeof finalStatuses)[number], (typeof finalStatuses)[number][]> = {
      PENDING: [],
      CONFIRMED: ["CONFIRMED"],
      IN_TRANSIT: ["CONFIRMED", "IN_TRANSIT"],
      DELIVERED: ["CONFIRMED", "IN_TRANSIT", "DELIVERED"],
      CANCELLED: ["CANCELLED"],
    };

    for (let i = 0; i < 8; i++) {
      const customer = customers[i % customers.length];
      const finalStatus = finalStatuses[i % finalStatuses.length];
      const orderNumber = `ORD-${String(i + 1).padStart(6, "0")}`;

      const order = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          orderNumber,
          customerId: customer.id,
          description: `Shipment of goods for order ${orderNumber}`,
          originAddress: "Warehouse Jakarta",
          destAddress: customer.address ?? "Customer address",
          status: "PENDING",
          createdById: dispatcher.id,
        },
      });

      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, status: "PENDING", changedById: dispatcher.id },
      });

      for (const step of lifecycleSteps[finalStatus]) {
        await prisma.order.update({ where: { id: order.id }, data: { status: step } });
        await prisma.orderStatusHistory.create({
          data: { orderId: order.id, status: step, changedById: admin.id },
        });
      }
    }
  }

  console.log("Seed complete:");
  console.log(`  SuperAdmin: superadmin@loopice.dev / ${DEMO_PASSWORD}`);
  console.log(`  Tenant: ${tenant.name} (${tenant.subdomain})`);
  console.log(`  TenantAdmin: admin@acme.test / ${DEMO_PASSWORD}`);
  console.log(`  Dispatcher: dispatcher@acme.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
