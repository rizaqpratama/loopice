-- CreateEnum
CREATE TYPE "ShipmentLegStatus" AS ENUM ('PLANNED', 'IN_TRANSIT', 'ARRIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLeg" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "legSequence" INTEGER NOT NULL,
    "originStationId" TEXT NOT NULL,
    "destStationId" TEXT NOT NULL,
    "status" "ShipmentLegStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLegStatusHistory" (
    "id" TEXT NOT NULL,
    "shipmentLegId" TEXT NOT NULL,
    "status" "ShipmentLegStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentLegStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Station_tenantId_idx" ON "Station"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_tenantId_code_key" ON "Station"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ShipmentLeg_tenantId_idx" ON "ShipmentLeg"("tenantId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_serviceOrderId_idx" ON "ShipmentLeg"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_originStationId_idx" ON "ShipmentLeg"("originStationId");

-- CreateIndex
CREATE INDEX "ShipmentLeg_destStationId_idx" ON "ShipmentLeg"("destStationId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentLeg_serviceOrderId_legSequence_key" ON "ShipmentLeg"("serviceOrderId", "legSequence");

-- CreateIndex
CREATE INDEX "ShipmentLegStatusHistory_shipmentLegId_idx" ON "ShipmentLegStatusHistory"("shipmentLegId");

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_originStationId_fkey" FOREIGN KEY ("originStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_destStationId_fkey" FOREIGN KEY ("destStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLegStatusHistory" ADD CONSTRAINT "ShipmentLegStatusHistory_shipmentLegId_fkey" FOREIGN KEY ("shipmentLegId") REFERENCES "ShipmentLeg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLegStatusHistory" ADD CONSTRAINT "ShipmentLegStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
