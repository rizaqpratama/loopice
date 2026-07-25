import { z } from "zod";
import { SERVICE_ORDER_STATUSES } from "./serviceOrderStatus";
import { SHIPMENT_LEG_STATUSES } from "./shipmentLegStatus";
import { SHIPMENT_TYPES } from "./shipmentType";
import { USER_ROLES } from "./roles";

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
