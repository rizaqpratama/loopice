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

  const existingServiceOrders = await prisma.serviceOrder.count({ where: { tenantId: tenant.id } });
  if (existingServiceOrders === 0) {
    const finalStatuses = [
      "DRAFT",
      "QUOTED",
      "CONFIRMED",
      "PLANNED",
      "IN_PROGRESS",
      "COMPLETED",
      "BILLED",
      "CLOSED",
      "CANCELLED",
    ] as const;

    // Steps taken *after* the initial DRAFT creation to reach each final
    // status -- mirrors the real lifecycle rather than jumping straight there.
    const lifecycleSteps: Record<(typeof finalStatuses)[number], (typeof finalStatuses)[number][]> = {
      DRAFT: [],
      QUOTED: ["QUOTED"],
      CONFIRMED: ["QUOTED", "CONFIRMED"],
      PLANNED: ["QUOTED", "CONFIRMED", "PLANNED"],
      IN_PROGRESS: ["QUOTED", "CONFIRMED", "PLANNED", "IN_PROGRESS"],
      COMPLETED: ["QUOTED", "CONFIRMED", "PLANNED", "IN_PROGRESS", "COMPLETED"],
      BILLED: ["QUOTED", "CONFIRMED", "PLANNED", "IN_PROGRESS", "COMPLETED", "BILLED"],
      CLOSED: ["QUOTED", "CONFIRMED", "PLANNED", "IN_PROGRESS", "COMPLETED", "BILLED", "CLOSED"],
      CANCELLED: ["QUOTED", "CANCELLED"],
    };

    const shipmentTemplates = [
      { type: "PALLET" as const, quantity: 4, weightKg: 320, lengthCm: 120, widthCm: 100, heightCm: 150, description: "Dry goods, shrink-wrapped" },
      { type: "CONTAINER" as const, quantity: 1, weightKg: 4200, lengthCm: 600, widthCm: 244, heightCm: 259, description: "20ft container, general cargo" },
      { type: "PARCEL" as const, quantity: 12, weightKg: 45, lengthCm: 40, widthCm: 30, heightCm: 30, description: "Retail parcels" },
    ];

    for (let i = 0; i < finalStatuses.length; i++) {
      const customer = customers[i % customers.length];
      const finalStatus = finalStatuses[i];
      const soNumber = `SO-${String(i + 1).padStart(6, "0")}`;

      const serviceOrder = await prisma.serviceOrder.create({
        data: {
          tenantId: tenant.id,
          soNumber,
          customerId: customer.id,
          description: `Freight movement for ${soNumber}`,
          originAddress: "Warehouse Jakarta",
          destAddress: customer.address ?? "Customer address",
          status: "DRAFT",
          createdById: dispatcher.id,
        },
      });

      await prisma.serviceOrderStatusHistory.create({
        data: { serviceOrderId: serviceOrder.id, status: "DRAFT", changedById: dispatcher.id },
      });

      for (const step of lifecycleSteps[finalStatus]) {
        await prisma.serviceOrder.update({ where: { id: serviceOrder.id }, data: { status: step } });
        await prisma.serviceOrderStatusHistory.create({
          data: { serviceOrderId: serviceOrder.id, status: step, changedById: admin.id },
        });
      }

      const template = shipmentTemplates[i % shipmentTemplates.length];
      await prisma.shipment.create({
        data: { tenantId: tenant.id, serviceOrderId: serviceOrder.id, ...template },
      });
      if (i % 2 === 0) {
        const secondTemplate = shipmentTemplates[(i + 1) % shipmentTemplates.length];
        await prisma.shipment.create({
          data: { tenantId: tenant.id, serviceOrderId: serviceOrder.id, ...secondTemplate },
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
