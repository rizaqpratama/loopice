import { z } from "zod";
import { SERVICE_ORDER_STATUSES } from "./serviceOrderStatus";
import { SHIPMENT_LEG_STATUSES } from "./shipmentLegStatus";
import { SHIPMENT_TYPES } from "./shipmentType";
import { USER_ROLES } from "./roles";
import { TASK_STATUSES } from "./taskStatus";
import {
  TASK_PRIORITIES,
  TASK_LOCATION_TYPES,
  ASSIGNEE_TYPES,
  LOCATION_REQUIREMENTS,
  CARGO_REQUIREMENTS,
} from "./taskEnums";
import { DRIVER_STATUSES, VEHICLE_STATUSES } from "./fleetEnums";
import { TRIP_STATUSES, TRIP_TYPES, TRANSFER_TYPES } from "./tripEnums";
import { EXCEPTION_TYPES, EXCEPTION_SEVERITIES, EXCEPTION_STATUSES } from "./exceptionType";
import { DEPENDENCY_TYPES } from "./dependencyType";
import { PROOF_TYPES } from "./proofType";
import { MANIFEST_ITEM_TYPES } from "./manifestEnums";
import { ROUTE_STOP_TYPES } from "./routeEnums";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const createTenantSchema = z.object({
  name: z.string().min(1),
  subdomain: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and hyphens only"),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(USER_ROLES).refine((r) => r !== "SUPERADMIN", {
    message: "Cannot create SUPERADMIN via tenant users API",
  }),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createServiceOrderSchema = z.object({
  customerId: z.string().min(1),
  description: z.string().optional(),
  originAddress: z.string().optional(),
  destAddress: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateServiceOrderSchema = z.object({
  description: z.string().optional(),
  originAddress: z.string().optional(),
  destAddress: z.string().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const updateServiceOrderStatusSchema = z.object({
  status: z.enum(SERVICE_ORDER_STATUSES),
  note: z.string().optional(),
});

export const createShipmentSchema = z.object({
  type: z.enum(SHIPMENT_TYPES),
  quantity: z.number().int().min(1).default(1),
  weightKg: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  description: z.string().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const createStationSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "uppercase letters, numbers, and hyphens only"),
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().optional(),
});

export const updateStationSchema = createStationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createShipmentLegSchema = z
  .object({
    originStationId: z.string().min(1),
    destStationId: z.string().min(1),
    notes: z.string().optional(),
  })
  .refine((data) => data.originStationId !== data.destStationId, {
    message: "Origin and destination station must differ",
    path: ["destStationId"],
  });

export const updateShipmentLegStatusSchema = z.object({
  status: z.enum(SHIPMENT_LEG_STATUSES),
  note: z.string().optional(),
});

// -- Task management --------------------------------------------------

const taskLocationFields = {
  locationType: z.enum(TASK_LOCATION_TYPES).optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  locationLatitude: z.number().optional(),
  locationLongitude: z.number().optional(),
  locationContactName: z.string().optional(),
  locationContactPhone: z.string().optional(),
  locationAccessNotes: z.string().optional(),
};

export const createTaskSchema = z.object({
  taskTypeId: z.string().min(1),
  priority: z.enum(TASK_PRIORITIES).optional(),
  serviceOrderId: z.string().optional(),
  customerId: z.string().optional(),
  facilityId: z.string().optional(),
  shipmentIds: z.array(z.string()).optional(),
  scheduledDate: z.string().datetime().optional(),
  timeWindowStart: z.string().datetime().optional(),
  timeWindowEnd: z.string().datetime().optional(),
  estimatedServiceDurationMinutes: z.number().int().positive().optional(),
  requiredSkills: z.array(z.string()).optional(),
  requiredVehicleCapabilities: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  ...taskLocationFields,
});

export const updateTaskSchema = z.object({
  priority: z.enum(TASK_PRIORITIES).optional(),
  facilityId: z.string().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  timeWindowStart: z.string().datetime().nullable().optional(),
  timeWindowEnd: z.string().datetime().nullable().optional(),
  estimatedServiceDurationMinutes: z.number().int().positive().nullable().optional(),
  requiredSkills: z.array(z.string()).optional(),
  requiredVehicleCapabilities: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  ...taskLocationFields,
  expectedVersion: z.number().int(),
});

export const assignTaskSchema = z
  .object({
    assignedDriverId: z.string().optional(),
    assignedVehicleId: z.string().optional(),
    assignedStaffId: z.string().optional(),
    assignedTeamId: z.string().optional(),
    assignedPartnerId: z.string().optional(),
    tripId: z.string().optional(),
    routeId: z.string().optional(),
    stopId: z.string().optional(),
    override: z.boolean().optional(),
    overrideReason: z.string().optional(),
    expectedVersion: z.number().int(),
    clientRequestId: z.string().optional(),
  })
  .refine(
    (data) =>
      !!(
        data.assignedDriverId ||
        data.assignedVehicleId ||
        data.assignedStaffId ||
        data.assignedTeamId ||
        data.assignedPartnerId
      ),
    { message: "At least one assignee must be provided" }
  )
  .refine((data) => !data.override || !!data.overrideReason, {
    message: "overrideReason is required when override is true",
    path: ["overrideReason"],
  });

export const unassignTaskSchema = z.object({
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const rescheduleTaskSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  timeWindowStart: z.string().datetime().optional(),
  timeWindowEnd: z.string().datetime().optional(),
  reason: z.string().min(1),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const cancelTaskSchema = z.object({
  reason: z.string().min(1),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

const proofEntrySchema = z.object({
  type: z.enum(PROOF_TYPES),
  fileUrl: z.string().optional(),
  textValue: z.string().optional(),
  numericValue: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const completeTaskSchema = z.object({
  note: z.string().optional(),
  proof: z.array(proofEntrySchema).optional(),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const partialCompleteTaskSchema = z.object({
  note: z.string().min(1),
  proof: z.array(proofEntrySchema).optional(),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const failTaskSchema = z.object({
  exceptionType: z.enum(EXCEPTION_TYPES),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const addProofSchema = proofEntrySchema;

export const createExceptionSchema = z.object({
  type: z.enum(EXCEPTION_TYPES),
  severity: z.enum(EXCEPTION_SEVERITIES).optional(),
  description: z.string().optional(),
});

export const reportTripExceptionSchema = z.object({
  type: z.enum(EXCEPTION_TYPES),
  severity: z.enum(EXCEPTION_SEVERITIES).optional(),
  description: z.string().optional(),
});

export const updateExceptionSchema = z.object({
  severity: z.enum(EXCEPTION_SEVERITIES).optional(),
  status: z.enum(EXCEPTION_STATUSES).optional(),
  assignedToId: z.string().nullable().optional(),
  resolution: z.string().optional(),
  followUpTaskId: z.string().optional(),
});

export const addDependencySchema = z.object({
  relatedTaskId: z.string().min(1),
  type: z.enum(DEPENDENCY_TYPES),
  direction: z.enum(["predecessor", "successor"]),
});

export const bulkAssignSchema = z
  .object({
    taskIds: z.array(z.string()).min(1),
    assignedDriverId: z.string().optional(),
    assignedVehicleId: z.string().optional(),
    assignedStaffId: z.string().optional(),
    assignedTeamId: z.string().optional(),
    assignedPartnerId: z.string().optional(),
    override: z.boolean().optional(),
    overrideReason: z.string().optional(),
  })
  .refine((data) => !data.override || !!data.overrideReason, {
    message: "overrideReason is required when override is true",
    path: ["overrideReason"],
  });

export const bulkStatusSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  status: z.enum(TASK_STATUSES),
  note: z.string().optional(),
});

export const reorderTaskSequenceSchema = z.object({
  taskIds: z.array(z.string()).min(1),
});

// -- Fleet / grouping entities ------------------------------------------

export const createDriverSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().datetime().optional(),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  homeStationId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDriverSchema = createDriverSchema.partial().extend({
  status: z.enum(DRIVER_STATUSES).optional(),
});

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1),
  type: z.string().min(1),
  capacityKg: z.number().positive().optional(),
  capacityM3: z.number().positive().optional(),
  capabilities: z.array(z.string()).optional(),
  homeStationId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(VEHICLE_STATUSES).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leaderId: z.string().optional(),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1),
});

export const createPartnerSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createTripSchema = z.object({
  tripType: z.enum(TRIP_TYPES).optional(),
  transferType: z.enum(TRANSFER_TYPES).optional(),
  serviceDate: z.string().datetime().optional(),
  originFacilityId: z.string().optional(),
  destinationFacilityId: z.string().optional(),
  originLocationId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  plannedStartTime: z.string().datetime().optional(),
  plannedEndTime: z.string().datetime().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
});

export const updateTripSchema = z.object({
  serviceDate: z.string().datetime().optional(),
  plannedStartTime: z.string().datetime().optional(),
  plannedEndTime: z.string().datetime().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  expectedVersion: z.number().int(),
});

export const updateTripStatusSchema = z.object({
  status: z.enum(TRIP_STATUSES),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const assignVehicleSchema = z.object({
  vehicleId: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const addSecondaryDriverSchema = z.object({
  driverId: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const removeSecondaryDriverSchema = z.object({
  expectedVersion: z.number().int(),
});

export const createRouteSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  tripId: z.string().optional(),
  isTemplate: z.boolean().optional(),
  startLocationId: z.string().optional(),
  endLocationId: z.string().optional(),
});

export const updateRouteSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  isTemplate: z.boolean().optional(),
  expectedVersion: z.number().int(),
});

export const updateRouteStatusSchema = z.object({
  status: z.enum(["DRAFT", "PLANNED", "ACTIVE", "COMPLETED", "SUPERSEDED", "CANCELLED"]),
  expectedVersion: z.number().int(),
});

export const activateRouteVersionSchema = z.object({
  expectedVersion: z.number().int(),
});

export const createRouteStopSchema = z.object({
  stopType: z.enum(ROUTE_STOP_TYPES).optional(),
  sequenceNumber: z.number().int(),
  facilityId: z.string().optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  plannedArrivalTime: z.string().datetime().optional(),
  plannedDepartureTime: z.string().datetime().optional(),
  estimatedServiceDurationMinutes: z.number().int().optional(),
  timeWindowStart: z.string().datetime().optional(),
  timeWindowEnd: z.string().datetime().optional(),
  accessNotes: z.string().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  isMandatory: z.boolean().optional(),
  sourceTaskId: z.string().optional(),
  expectedVersion: z.number().int(),
});

export const updateRouteStopSchema = z.object({
  stopType: z.enum(ROUTE_STOP_TYPES).optional(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  plannedArrivalTime: z.string().datetime().optional(),
  plannedDepartureTime: z.string().datetime().optional(),
  estimatedServiceDurationMinutes: z.number().int().optional(),
  timeWindowStart: z.string().datetime().optional(),
  timeWindowEnd: z.string().datetime().optional(),
  accessNotes: z.string().optional(),
  instructions: z.string().optional(),
  notes: z.string().optional(),
  isMandatory: z.boolean().optional(),
  expectedVersion: z.number().int(),
});

export const deleteRouteStopSchema = z.object({
  expectedVersion: z.number().int(),
});

export const linkTaskToStopSchema = z.object({
  expectedVersion: z.number().int(),
});


export const createTaskTypeConfigSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(30)
    .regex(/^[A-Z0-9_]+$/, "uppercase letters, numbers, and underscores only"),
  name: z.string().min(1),
  category: z.string().min(1),
  allowedStatuses: z.array(z.enum(TASK_STATUSES)).optional(),
  requiredFields: z.array(z.string()).optional(),
  requiredProofTypes: z.array(z.enum(PROOF_TYPES)).optional(),
  allowedAssigneeTypes: z.array(z.enum(ASSIGNEE_TYPES)).optional(),
  defaultServiceDurationMinutes: z.number().int().positive().optional(),
  locationRequirement: z.enum(LOCATION_REQUIREMENTS).optional(),
  cargoRequirement: z.enum(CARGO_REQUIREMENTS).optional(),
  facilityRequirement: z.boolean().optional(),
  isRouteable: z.boolean().optional(),
  isBillable: z.boolean().optional(),
  isCustomerFacing: z.boolean().optional(),
  failureReasonCodes: z.array(z.enum(EXCEPTION_TYPES)).optional(),
  completionChecklist: z.array(z.string()).optional(),
});

export const updateTaskTypeConfigSchema = createTaskTypeConfigSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// -- Manifest management --------------------------------------------------

export const createManifestSchema = z.object({
  tripId: z.string().min(1),
  originFacilityId: z.string().min(1),
  destinationFacilityId: z.string().min(1),
});

export const addManifestItemSchema = z
  .object({
    shipmentId: z.string().optional(),
    cargoItemId: z.string().optional(),
    handlingUnitId: z.string().optional(),
    itemType: z.enum(MANIFEST_ITEM_TYPES).optional(),
    identifier: z.string().optional(),
    plannedQuantity: z.number().int().positive().optional(),
    weight: z.number().positive().optional(),
    volume: z.number().positive().optional(),
    notes: z.string().optional(),
    override: z.boolean().optional(),
    overrideReason: z.string().optional(),
  })
  .refine((data) => !data.override || !!data.overrideReason, {
    message: "overrideReason is required when override is true",
    path: ["overrideReason"],
  });

export const updateManifestItemLoadingSchema = z.object({
  loadingStatus: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const updateManifestItemReceivingSchema = z.object({
  receivingStatus: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const sealManifestSchema = z.object({
  sealNumber: z.string().min(1),
  expectedVersion: z.number().int(),
});

export const closeManifestSchema = z.object({
  expectedVersion: z.number().int(),
});

// -- Facility Handover management --------------------------------------------------

export const createHandoverSchema = z.object({
  tripId: z.string().min(1),
  manifestId: z.string().min(1),
  handoverType: z.enum(["ORIGIN_TO_DRIVER", "DRIVER_TO_DESTINATION", "FACILITY_TO_PARTNER", "PARTNER_TO_FACILITY", "OTHER"]),
  facilityId: z.string().min(1),
  fromActorType: z.enum(["FACILITY", "DRIVER", "PARTNER", "SYSTEM"]),
  fromActorId: z.string().optional(),
  toActorType: z.enum(["FACILITY", "DRIVER", "PARTNER", "SYSTEM"]),
  toActorId: z.string().optional(),
  expectedItemCount: z.number().int().optional(),
  sealNumber: z.string().optional(),
  sealCondition: z.string().optional(),
  notes: z.string().optional(),
});

export const acceptHandoverSchema = z.object({
  acceptedWithException: z.boolean().optional(),
  actualItemCount: z.number().int().optional(),
  notes: z.string().optional(),
  expectedVersion: z.number().int(),
});

export const rejectHandoverSchema = z.object({
  expectedVersion: z.number().int(),
});

// -- Receiving & Reconciliation --------------------------------------------------

export const startReconciliationSchema = z.object({
  tripId: z.string().min(1),
  manifestId: z.string().min(1),
  destinationFacilityId: z.string().min(1),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const recordReconciliationCountsSchema = z.object({
  counts: z.array(
    z.object({
      itemId: z.string().min(1),
      receivedQuantity: z.number().int(),
      condition: z.enum(["GOOD", "DAMAGED", "UNIDENTIFIED"]).optional(),
      conditionNotes: z.string().optional(),
    })
  ),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const completeReconciliationSchema = z.object({
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

export const spawnDiscrepancyTaskSchema = z.object({
  itemId: z.string().min(1),
  taskTypeId: z.string().min(1),
  expectedVersion: z.number().int(),
  clientRequestId: z.string().optional(),
});

// -- Trip Replacement --------------------------------------------------

export const createReplacementTripSchema = z.object({
  vehicleId: z.string().optional(),
  primaryDriverId: z.string().optional(),
  replacementReason: z.string().min(1),
});
