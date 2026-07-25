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

async function findOrCreateStation(
  tenantId: string,
  data: { code: string; name: string; city: string; address: string }
) {
  const existing = await prisma.station.findUnique({
    where: { tenantId_code: { tenantId, code: data.code } },
  });
  if (existing) return existing;
  return prisma.station.create({ data: { tenantId, ...data } });
}

async function findOrCreateTaskTypeConfig(
  tenantId: string,
  data: {
    code: string;
    name: string;
    category: string;
    requiredProofTypes?: string[];
    isCustomerFacing?: boolean;
  }
) {
  const existing = await prisma.taskTypeConfig.findUnique({
    where: { tenantId_code: { tenantId, code: data.code } },
  });
  if (existing) return existing;
  return prisma.taskTypeConfig.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      category: data.category,
      requiredProofTypes: data.requiredProofTypes ?? [],
      isCustomerFacing: data.isCustomerFacing ?? true,
    },
  });
}

type LegStatus = "PLANNED" | "IN_TRANSIT" | "ARRIVED";

async function createSeedLeg(
  tenantId: string,
  serviceOrderId: string,
  legSequence: number,
  originStationId: string,
  destStationId: string,
  finalStatus: LegStatus,
  changedById: string
) {
  const leg = await prisma.shipmentLeg.create({
    data: { tenantId, serviceOrderId, legSequence, originStationId, destStationId, status: "PLANNED" },
  });
  await prisma.shipmentLegStatusHistory.create({
    data: { shipmentLegId: leg.id, status: "PLANNED", changedById },
  });

  const stepsToFinalStatus: Record<LegStatus, ("IN_TRANSIT" | "ARRIVED")[]> = {
    PLANNED: [],
    IN_TRANSIT: ["IN_TRANSIT"],
    ARRIVED: ["IN_TRANSIT", "ARRIVED"],
  };
  for (const step of stepsToFinalStatus[finalStatus]) {
    await prisma.shipmentLeg.update({ where: { id: leg.id }, data: { status: step } });
    await prisma.shipmentLegStatusHistory.create({
      data: { shipmentLegId: leg.id, status: step, changedById },
    });
  }
  return leg;
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

  const stationSeeds = [
    { code: "JKT-01", name: "Jakarta Hub", city: "Jakarta", address: "Jl. Gudang Selatan 1, Jakarta" },
    { code: "BDG-01", name: "Bandung Depot", city: "Bandung", address: "Jl. Soekarno-Hatta 200, Bandung" },
    { code: "SBY-01", name: "Surabaya Depot", city: "Surabaya", address: "Jl. Kalianak 15, Surabaya" },
    { code: "SMG-01", name: "Semarang Depot", city: "Semarang", address: "Jl. Kaligawe 88, Semarang" },
  ];
  const stations = [];
  for (const seed of stationSeeds) {
    stations.push(await findOrCreateStation(tenant.id, seed));
  }
  const [jakarta, bandung, surabaya] = stations;

  const taskTypeSeeds = [
    { code: "PICKUP", name: "Pickup", category: "TRANSPORT", requiredProofTypes: ["SIGNATURE"] },
    { code: "DELIVERY", name: "Delivery", category: "TRANSPORT", requiredProofTypes: ["SIGNATURE", "RECIPIENT_NAME"] },
    { code: "RECEIVING", name: "Receiving", category: "WAREHOUSE", requiredProofTypes: ["QUANTITY_CONFIRMATION"], isCustomerFacing: false },
    { code: "LOADING", name: "Loading", category: "WAREHOUSE", requiredProofTypes: ["BARCODE_SCAN"], isCustomerFacing: false },
    { code: "UNLOADING", name: "Unloading", category: "WAREHOUSE", requiredProofTypes: ["BARCODE_SCAN"], isCustomerFacing: false },
    { code: "SORTING", name: "Sorting", category: "WAREHOUSE", isCustomerFacing: false },
    { code: "CONSOLIDATION", name: "Consolidation", category: "WAREHOUSE", isCustomerFacing: false },
    { code: "DECONSOLIDATION", name: "Deconsolidation", category: "WAREHOUSE", isCustomerFacing: false },
    { code: "INSPECTION", name: "Inspection", category: "QUALITY", requiredProofTypes: ["PHOTO", "CONDITION_CONFIRMATION"], isCustomerFacing: false },
    { code: "CUSTOMER_HANDOVER", name: "Customer Handover", category: "TRANSPORT", requiredProofTypes: ["SIGNATURE"] },
    { code: "PARTNER_HANDOVER", name: "Partner Handover", category: "TRANSPORT", isCustomerFacing: false },
    { code: "RETURN", name: "Return", category: "TRANSPORT", requiredProofTypes: ["CONDITION_CONFIRMATION"] },
    { code: "TRANSFER", name: "Transfer", category: "TRANSPORT", isCustomerFacing: false },
    { code: "OTHER", name: "Other", category: "GENERAL" },
  ];
  for (const seed of taskTypeSeeds) {
    await findOrCreateTaskTypeConfig(tenant.id, seed);
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

    // Only the SOs whose route has actually started planning get a seeded
    // route -- earlier-stage SOs (DRAFT/QUOTED/CONFIRMED) haven't reached
    // routing yet, and CANCELLED/BILLED/CLOSED don't need a fresh one.
    const legStatusesByFinalStatus: Partial<Record<(typeof finalStatuses)[number], [LegStatus, LegStatus]>> = {
      PLANNED: ["PLANNED", "PLANNED"],
      IN_PROGRESS: ["ARRIVED", "IN_TRANSIT"],
      COMPLETED: ["ARRIVED", "ARRIVED"],
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

      const legStatuses = legStatusesByFinalStatus[finalStatus];
      if (legStatuses && jakarta && bandung && surabaya) {
        await createSeedLeg(tenant.id, serviceOrder.id, 1, jakarta.id, bandung.id, legStatuses[0], admin.id);
        await createSeedLeg(tenant.id, serviceOrder.id, 2, bandung.id, surabaya.id, legStatuses[1], admin.id);
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
