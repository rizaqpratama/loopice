-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('DIRECT_DELIVERY', 'PICKUP_RUN', 'DELIVERY_RUN', 'PICKUP_AND_DELIVERY', 'MILK_RUN', 'LINEHAUL', 'INTER_FACILITY', 'INTER_HUB', 'WAREHOUSE_TRANSFER', 'BRANCH_TRANSFER', 'DEPOT_TRANSFER', 'CROSS_DOCK_TRANSFER', 'FACILITY_TRANSFER', 'RETURN_TRIP', 'VEHICLE_REPOSITIONING', 'AD_HOC', 'OTHER');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('INTER_HUB', 'WAREHOUSE_TRANSFER', 'BRANCH_TRANSFER', 'DEPOT_TRANSFER', 'CROSS_DOCK_TRANSFER', 'STOCK_REBALANCING', 'RETURN_TO_ORIGIN', 'VEHICLE_REPOSITIONING', 'OTHER');

-- CreateEnum
CREATE TYPE "RouteSource" AS ENUM ('MANUAL', 'SYSTEM_SUGGESTED', 'OPTIMIZED', 'IMPORTED', 'RECALCULATED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStopType" AS ENUM ('DEPOT_START', 'DEPOT_END', 'PICKUP', 'DELIVERY', 'PICKUP_AND_DELIVERY', 'ORIGIN_FACILITY', 'DESTINATION_FACILITY', 'INTERMEDIATE_FACILITY', 'FACILITY', 'BREAK', 'FUEL', 'CHECKPOINT', 'OTHER');

-- CreateEnum
CREATE TYPE "RouteStopStatus" AS ENUM ('PLANNED', 'SKIPPED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteStopTaskAssignmentStatus" AS ENUM ('PLANNED', 'ASSIGNED', 'REMOVED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ManifestStatus" AS ENUM ('DRAFT', 'PLANNED', 'LOADING', 'LOADED', 'SEALED', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'UNLOADING', 'RECEIVING', 'RECONCILING', 'MATCHED', 'DISCREPANCY', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManifestItemType" AS ENUM ('SHIPMENT', 'PARCEL', 'CARTON', 'PALLET', 'CONTAINER', 'BAG', 'CAGE', 'LOOSE_CARGO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ManifestItemLoadingStatus" AS ENUM ('PLANNED', 'SCANNED', 'LOADED', 'MISSING', 'REMOVED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "ManifestItemReceivingStatus" AS ENUM ('PENDING', 'RECEIVED', 'PARTIALLY_RECEIVED', 'MISSING', 'DAMAGED', 'EXCESS', 'UNIDENTIFIED');

-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('MISSING', 'EXCESS', 'DAMAGED', 'PARTIAL_QUANTITY', 'INCORRECT_CARGO', 'MISSORT', 'UNIDENTIFIED', 'SEAL_BROKEN', 'DOCUMENT_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('ORIGIN_TO_DRIVER', 'DRIVER_TO_DESTINATION', 'FACILITY_TO_PARTNER', 'PARTNER_TO_FACILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ACCEPTED', 'ACCEPTED_WITH_EXCEPTION', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandoverActorType" AS ENUM ('FACILITY', 'DRIVER', 'PARTNER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'MATCHED', 'PARTIAL', 'DISCREPANCY', 'UNDER_INVESTIGATION', 'RESOLVED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExceptionType" ADD VALUE 'ROUTE_BLOCKED';
ALTER TYPE "ExceptionType" ADD VALUE 'HEAVY_TRAFFIC';
ALTER TYPE "ExceptionType" ADD VALUE 'CARGO_EXCESS';
ALTER TYPE "ExceptionType" ADD VALUE 'UNIDENTIFIED_CARGO';
ALTER TYPE "ExceptionType" ADD VALUE 'SEAL_BROKEN';
ALTER TYPE "ExceptionType" ADD VALUE 'DOCUMENT_MISMATCH';
ALTER TYPE "ExceptionType" ADD VALUE 'LATE_DEPARTURE';
ALTER TYPE "ExceptionType" ADD VALUE 'FAILED_PICKUP';
ALTER TYPE "ExceptionType" ADD VALUE 'FAILED_DELIVERY';
ALTER TYPE "ExceptionType" ADD VALUE 'FAILED_LOADING';
ALTER TYPE "ExceptionType" ADD VALUE 'FAILED_UNLOADING';
ALTER TYPE "ExceptionType" ADD VALUE 'ACCIDENT';
ALTER TYPE "ExceptionType" ADD VALUE 'ORIGIN_FACILITY_CLOSED';
ALTER TYPE "ExceptionType" ADD VALUE 'DESTINATION_FACILITY_CLOSED';

-- AlterEnum
-- Note: the auto-generated diff also tried to ALTER TABLE "TripStatusHistory"
-- here, but that table doesn't exist yet -- it's created later in this same
-- migration (as CREATE TABLE "TripStatusHistory", using the "TripStatus" type
-- name, which by then already refers to the swapped-in new enum below). That
-- statement has been removed as dead/erroneous.
BEGIN;
CREATE TYPE "TripStatus_new" AS ENUM ('DRAFT', 'PLANNING', 'READY', 'DISPATCHED', 'IN_PROGRESS', 'PAUSED', 'ARRIVED', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "Trip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Trip" ALTER COLUMN "status" TYPE "TripStatus_new" USING ("status"::text::"TripStatus_new");
ALTER TYPE "TripStatus" RENAME TO "TripStatus_old";
ALTER TYPE "TripStatus_new" RENAME TO "TripStatus";
DROP TYPE "TripStatus_old";
ALTER TABLE "Trip" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'FACILITY_SUPERVISOR';

-- DropForeignKey
ALTER TABLE "TaskException" DROP CONSTRAINT "TaskException_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_routeId_fkey";

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "actualDistance" DOUBLE PRECISION,
ADD COLUMN     "actualDuration" INTEGER,
ADD COLUMN     "changeReason" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "endLocationId" TEXT,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "optimizationMethod" TEXT,
ADD COLUMN     "optimizationScore" DOUBLE PRECISION,
ADD COLUMN     "polyline" TEXT,
ADD COLUMN     "previousRouteVersionId" TEXT,
ADD COLUMN     "routeNumber" TEXT NOT NULL,
ADD COLUMN     "source" "RouteSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "startLocationId" TEXT,
ADD COLUMN     "status" "RouteStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "totalDistance" DOUBLE PRECISION,
ADD COLUMN     "totalStops" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tripId" TEXT,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "RouteStop" DROP COLUMN "name",
ADD COLUMN     "accessNotes" TEXT,
ADD COLUMN     "actualArrivalTime" TIMESTAMP(3),
ADD COLUMN     "actualDepartureTime" TIMESTAMP(3),
ADD COLUMN     "actualServiceStartTime" TIMESTAMP(3),
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "estimatedServiceDurationMinutes" INTEGER,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "isMandatory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "plannedArrivalTime" TIMESTAMP(3),
ADD COLUMN     "plannedDepartureTime" TIMESTAMP(3),
ADD COLUMN     "status" "RouteStopStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "stopType" "RouteStopType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "timeWindowEnd" TIMESTAMP(3),
ADD COLUMN     "timeWindowStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskException" ADD COLUMN     "billingHold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "claimReference" TEXT,
ADD COLUMN     "manifestId" TEXT,
ADD COLUMN     "tripId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "completedAt",
DROP COLUMN "driverId",
DROP COLUMN "routeId",
DROP COLUMN "scheduledDate",
DROP COLUMN "startedAt",
ADD COLUMN     "activeRouteId" TEXT,
ADD COLUMN     "actualEndTime" TIMESTAMP(3),
ADD COLUMN     "actualLoadedQuantity" INTEGER,
ADD COLUMN     "actualReceivedQuantity" INTEGER,
ADD COLUMN     "actualStartTime" TIMESTAMP(3),
ADD COLUMN     "arrivalTime" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "destinationFacilityId" TEXT,
ADD COLUMN     "destinationLocationId" TEXT,
ADD COLUMN     "dispatchReference" TEXT,
ADD COLUMN     "dispatchTime" TIMESTAMP(3),
ADD COLUMN     "distanceActual" DOUBLE PRECISION,
ADD COLUMN     "distancePlanned" DOUBLE PRECISION,
ADD COLUMN     "durationActual" INTEGER,
ADD COLUMN     "durationPlanned" INTEGER,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "manifestId" TEXT,
ADD COLUMN     "odometerEnd" DOUBLE PRECISION,
ADD COLUMN     "odometerStart" DOUBLE PRECISION,
ADD COLUMN     "originFacilityId" TEXT,
ADD COLUMN     "originLocationId" TEXT,
ADD COLUMN     "parentTripId" TEXT,
ADD COLUMN     "plannedEndTime" TIMESTAMP(3),
ADD COLUMN     "plannedLoadKg" DOUBLE PRECISION,
ADD COLUMN     "plannedLoadM3" DOUBLE PRECISION,
ADD COLUMN     "plannedLoadPallets" INTEGER,
ADD COLUMN     "plannedStartTime" TIMESTAMP(3),
ADD COLUMN     "primaryDriverId" TEXT,
ADD COLUMN     "receivingReference" TEXT,
ADD COLUMN     "replacementReason" TEXT,
ADD COLUMN     "replacementTripId" TEXT,
ADD COLUMN     "returnTime" TIMESTAMP(3),
ADD COLUMN     "serviceDate" TIMESTAMP(3),
ADD COLUMN     "transferType" "TransferType",
ADD COLUMN     "tripType" "TripType" NOT NULL DEFAULT 'DIRECT_DELIVERY',
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "vehicleCapacityKg" DOUBLE PRECISION,
ADD COLUMN     "vehicleCapacityM3" DOUBLE PRECISION,
ADD COLUMN     "vehicleCapacityPallets" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "capacityPallets" INTEGER;

-- CreateTable
CREATE TABLE "TripSecondaryDriver" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSecondaryDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStatusHistory" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "clientRequestId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStopTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "routeStopId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "executionSequence" INTEGER,
    "assignmentStatus" "RouteStopTaskAssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "assignedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removalReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteStopTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manifest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "manifestNumber" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "originFacilityId" TEXT NOT NULL,
    "destinationFacilityId" TEXT NOT NULL,
    "status" "ManifestStatus" NOT NULL DEFAULT 'DRAFT',
    "plannedItemCount" INTEGER,
    "plannedWeight" DOUBLE PRECISION,
    "plannedVolume" DOUBLE PRECISION,
    "loadedItemCount" INTEGER,
    "loadedWeight" DOUBLE PRECISION,
    "loadedVolume" DOUBLE PRECISION,
    "receivedItemCount" INTEGER,
    "receivedWeight" DOUBLE PRECISION,
    "receivedVolume" DOUBLE PRECISION,
    "sealNumber" TEXT,
    "sealedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManifestStatusHistory" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "status" "ManifestStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "clientRequestId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManifestStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManifestItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "cargoItemId" TEXT,
    "handlingUnitId" TEXT,
    "sourceManifestItemId" TEXT,
    "itemType" "ManifestItemType" NOT NULL DEFAULT 'SHIPMENT',
    "identifier" TEXT,
    "plannedQuantity" INTEGER,
    "loadedQuantity" INTEGER,
    "receivedQuantity" INTEGER,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "conditionAtLoading" TEXT,
    "conditionAtReceiving" TEXT,
    "loadingStatus" "ManifestItemLoadingStatus" NOT NULL DEFAULT 'PLANNED',
    "receivingStatus" "ManifestItemReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "discrepancyType" "DiscrepancyType",
    "discrepancyQuantity" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManifestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityHandover" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "handoverType" "HandoverType" NOT NULL,
    "facilityId" TEXT NOT NULL,
    "fromActorType" "HandoverActorType" NOT NULL,
    "fromActorId" TEXT,
    "toActorType" "HandoverActorType" NOT NULL,
    "toActorId" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "expectedItemCount" INTEGER,
    "actualItemCount" INTEGER,
    "sealNumber" TEXT,
    "sealCondition" TEXT,
    "handoverTime" TIMESTAMP(3),
    "acceptedTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FacilityHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingReconciliation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "destinationFacilityId" TEXT NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "expectedItemCount" INTEGER,
    "loadedItemCount" INTEGER,
    "receivedItemCount" INTEGER,
    "matchedItemCount" INTEGER,
    "missingItemCount" INTEGER,
    "excessItemCount" INTEGER,
    "damagedItemCount" INTEGER,
    "unidentifiedItemCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ReceivingReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "reason" TEXT,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT,
    "source" TEXT,
    "deviceId" TEXT,
    "correlationId" TEXT,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripSecondaryDriver_tripId_idx" ON "TripSecondaryDriver"("tripId");

-- CreateIndex
CREATE INDEX "TripSecondaryDriver_driverId_idx" ON "TripSecondaryDriver"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSecondaryDriver_tripId_driverId_key" ON "TripSecondaryDriver"("tripId", "driverId");

-- CreateIndex
CREATE INDEX "TripStatusHistory_tripId_idx" ON "TripStatusHistory"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripStatusHistory_tripId_clientRequestId_key" ON "TripStatusHistory"("tripId", "clientRequestId");

-- CreateIndex
CREATE INDEX "RouteStopTask_tenantId_idx" ON "RouteStopTask"("tenantId");

-- CreateIndex
CREATE INDEX "RouteStopTask_routeStopId_idx" ON "RouteStopTask"("routeStopId");

-- CreateIndex
CREATE INDEX "RouteStopTask_taskId_idx" ON "RouteStopTask"("taskId");

-- CreateIndex
CREATE INDEX "RouteStopTask_tenantId_taskId_assignmentStatus_idx" ON "RouteStopTask"("tenantId", "taskId", "assignmentStatus");

-- CreateIndex
-- Enforces "at most one active (PLANNED or ASSIGNED) RouteStopTask per task"
-- at the DB level. Prisma's schema language can't express a partial unique
-- index, so this is hand-appended, following the same technique already
-- used for users_superadmin_email_unique and Driver_tenantId_userId_key.
CREATE UNIQUE INDEX "RouteStopTask_active_taskId_key" ON "RouteStopTask"("taskId") WHERE "assignmentStatus" IN ('PLANNED', 'ASSIGNED');

-- CreateIndex
CREATE INDEX "Manifest_tenantId_idx" ON "Manifest"("tenantId");

-- CreateIndex
CREATE INDEX "Manifest_tenantId_tripId_idx" ON "Manifest"("tenantId", "tripId");

-- CreateIndex
CREATE INDEX "Manifest_tenantId_status_idx" ON "Manifest"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Manifest_tenantId_manifestNumber_key" ON "Manifest"("tenantId", "manifestNumber");

-- CreateIndex
CREATE INDEX "ManifestStatusHistory_manifestId_idx" ON "ManifestStatusHistory"("manifestId");

-- CreateIndex
CREATE UNIQUE INDEX "ManifestStatusHistory_manifestId_clientRequestId_key" ON "ManifestStatusHistory"("manifestId", "clientRequestId");

-- CreateIndex
CREATE INDEX "ManifestItem_tenantId_idx" ON "ManifestItem"("tenantId");

-- CreateIndex
CREATE INDEX "ManifestItem_manifestId_idx" ON "ManifestItem"("manifestId");

-- CreateIndex
CREATE INDEX "ManifestItem_shipmentId_idx" ON "ManifestItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ManifestItem_tenantId_loadingStatus_idx" ON "ManifestItem"("tenantId", "loadingStatus");

-- CreateIndex
CREATE INDEX "ManifestItem_tenantId_receivingStatus_idx" ON "ManifestItem"("tenantId", "receivingStatus");

-- CreateIndex
CREATE INDEX "FacilityHandover_tenantId_idx" ON "FacilityHandover"("tenantId");

-- CreateIndex
CREATE INDEX "FacilityHandover_tripId_idx" ON "FacilityHandover"("tripId");

-- CreateIndex
CREATE INDEX "FacilityHandover_manifestId_idx" ON "FacilityHandover"("manifestId");

-- CreateIndex
CREATE INDEX "FacilityHandover_tenantId_status_idx" ON "FacilityHandover"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingReconciliation_manifestId_key" ON "ReceivingReconciliation"("manifestId");

-- CreateIndex
CREATE INDEX "ReceivingReconciliation_tenantId_idx" ON "ReceivingReconciliation"("tenantId");

-- CreateIndex
CREATE INDEX "ReceivingReconciliation_tripId_idx" ON "ReceivingReconciliation"("tripId");

-- CreateIndex
CREATE INDEX "ReceivingReconciliation_tenantId_status_idx" ON "ReceivingReconciliation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_entityType_entityId_action_clientRequestId_key" ON "AuditLog"("entityType", "entityId", "action", "clientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_previousRouteVersionId_key" ON "Route"("previousRouteVersionId");

-- CreateIndex
CREATE INDEX "Route_tenantId_status_idx" ON "Route"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Route_tenantId_tripId_idx" ON "Route"("tenantId", "tripId");

-- CreateIndex
CREATE INDEX "Route_tenantId_isActive_idx" ON "Route"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Route_tenantId_routeNumber_version_key" ON "Route"("tenantId", "routeNumber", "version");

-- CreateIndex
CREATE INDEX "RouteStop_tenantId_facilityId_idx" ON "RouteStop"("tenantId", "facilityId");

-- CreateIndex
CREATE INDEX "TaskException_tripId_idx" ON "TaskException"("tripId");

-- CreateIndex
CREATE INDEX "TaskException_manifestId_idx" ON "TaskException"("manifestId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_replacementTripId_key" ON "Trip"("replacementTripId");

-- CreateIndex
CREATE INDEX "Trip_tenantId_serviceDate_idx" ON "Trip"("tenantId", "serviceDate");

-- CreateIndex
CREATE INDEX "Trip_tenantId_tripType_idx" ON "Trip"("tenantId", "tripType");

-- CreateIndex
CREATE INDEX "Trip_tenantId_vehicleId_idx" ON "Trip"("tenantId", "vehicleId");

-- CreateIndex
CREATE INDEX "Trip_tenantId_primaryDriverId_idx" ON "Trip"("tenantId", "primaryDriverId");

-- CreateIndex
CREATE INDEX "Trip_tenantId_originFacilityId_idx" ON "Trip"("tenantId", "originFacilityId");

-- CreateIndex
CREATE INDEX "Trip_tenantId_destinationFacilityId_idx" ON "Trip"("tenantId", "destinationFacilityId");

-- CreateIndex
CREATE INDEX "Trip_parentTripId_idx" ON "Trip"("parentTripId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_previousRouteVersionId_fkey" FOREIGN KEY ("previousRouteVersionId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_startLocationId_fkey" FOREIGN KEY ("startLocationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_endLocationId_fkey" FOREIGN KEY ("endLocationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_primaryDriverId_fkey" FOREIGN KEY ("primaryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_activeRouteId_fkey" FOREIGN KEY ("activeRouteId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_originFacilityId_fkey" FOREIGN KEY ("originFacilityId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_parentTripId_fkey" FOREIGN KEY ("parentTripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSecondaryDriver" ADD CONSTRAINT "TripSecondaryDriver_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSecondaryDriver" ADD CONSTRAINT "TripSecondaryDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStatusHistory" ADD CONSTRAINT "TripStatusHistory_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStatusHistory" ADD CONSTRAINT "TripStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskException" ADD CONSTRAINT "TaskException_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskException" ADD CONSTRAINT "TaskException_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskException" ADD CONSTRAINT "TaskException_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStopTask" ADD CONSTRAINT "RouteStopTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStopTask" ADD CONSTRAINT "RouteStopTask_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStopTask" ADD CONSTRAINT "RouteStopTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStopTask" ADD CONSTRAINT "RouteStopTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_originFacilityId_fkey" FOREIGN KEY ("originFacilityId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestStatusHistory" ADD CONSTRAINT "ManifestStatusHistory_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestStatusHistory" ADD CONSTRAINT "ManifestStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestItem" ADD CONSTRAINT "ManifestItem_sourceManifestItemId_fkey" FOREIGN KEY ("sourceManifestItemId") REFERENCES "ManifestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityHandover" ADD CONSTRAINT "FacilityHandover_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityHandover" ADD CONSTRAINT "FacilityHandover_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityHandover" ADD CONSTRAINT "FacilityHandover_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityHandover" ADD CONSTRAINT "FacilityHandover_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityHandover" ADD CONSTRAINT "FacilityHandover_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingReconciliation" ADD CONSTRAINT "ReceivingReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingReconciliation" ADD CONSTRAINT "ReceivingReconciliation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingReconciliation" ADD CONSTRAINT "ReceivingReconciliation_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingReconciliation" ADD CONSTRAINT "ReceivingReconciliation_destinationFacilityId_fkey" FOREIGN KEY ("destinationFacilityId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingReconciliation" ADD CONSTRAINT "ReceivingReconciliation_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

