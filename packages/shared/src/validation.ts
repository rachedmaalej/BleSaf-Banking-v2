import { z } from 'zod';
import {
  TICKET_STATUS,
  TICKET_PRIORITY,
  COUNTER_STATUS,
  QUEUE_STATUS,
  USER_ROLE,
  ENTITY_STATUS,
  NOTIFICATION_CHANNEL,
  CHECKIN_METHOD,
  LANGUAGE,
} from './constants';

// Common schemas
export const uuidSchema = z.string().uuid();

export const phoneSchema = z
  .string()
  .regex(/^(\+216)?[2459]\d{7}$/, 'Invalid Tunisian phone number')
  .transform((val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.startsWith('216')) {
      return `+${cleaned}`;
    }
    return `+216${cleaned}`;
  });

export const emailSchema = z.string().email().toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Enum schemas
export const ticketStatusSchema = z.enum([
  TICKET_STATUS.WAITING,
  TICKET_STATUS.CALLED,
  TICKET_STATUS.SERVING,
  TICKET_STATUS.COMPLETED,
  TICKET_STATUS.NO_SHOW,
  TICKET_STATUS.CANCELLED,
]);

export const ticketPrioritySchema = z.enum([TICKET_PRIORITY.NORMAL, TICKET_PRIORITY.VIP]);

export const counterStatusSchema = z.enum([
  COUNTER_STATUS.OPEN,
  COUNTER_STATUS.CLOSED,
  COUNTER_STATUS.PAUSED,
]);

export const queueStatusSchema = z.enum([
  QUEUE_STATUS.OPEN,
  QUEUE_STATUS.PAUSED,
  QUEUE_STATUS.CLOSED,
]);

// Time format validation (HH:mm in 24h format)
export const timeFormatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:mm (24h format)')
  .nullable();

export const userRoleSchema = z.enum([
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.BANK_ADMIN,
  USER_ROLE.BRANCH_MANAGER,
  USER_ROLE.TELLER,
]);

export const entityStatusSchema = z.enum([
  ENTITY_STATUS.ACTIVE,
  ENTITY_STATUS.INACTIVE,
  ENTITY_STATUS.SUSPENDED,
]);

export const notificationChannelSchema = z.enum([
  NOTIFICATION_CHANNEL.NONE,
  NOTIFICATION_CHANNEL.SMS,
  NOTIFICATION_CHANNEL.WHATSAPP,
]);

export const checkinMethodSchema = z.enum([
  CHECKIN_METHOD.KIOSK,
  CHECKIN_METHOD.MOBILE,
  CHECKIN_METHOD.MANUAL,
]);

export const languageSchema = z.enum([LANGUAGE.FRENCH, LANGUAGE.ARABIC]);

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  subdomain: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens'),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  languageConfig: z
    .object({
      default: languageSchema,
      available: z.array(languageSchema).min(1),
    })
    .optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

// Branch schemas
export const branchStatusSchema = z.enum(['active', 'inactive']);

export const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  address: z.string().max(500).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  timezone: z.string().default('Africa/Tunis'),
  notifyAtPosition: z.number().int().min(1).max(10).default(2),
  status: branchStatusSchema.default('inactive'),
});

export const updateBranchSchema = createBranchSchema.partial();

// Operating Hours schemas (for auto queue management)
export const operatingHoursSchema = z.object({
  autoQueueEnabled: z.boolean(),
  openingTime: timeFormatSchema.optional(), // "08:30" or null for tenant default
  closingTime: timeFormatSchema.optional(), // "16:30" or null for tenant default
  closedOnWeekends: z.boolean().optional().default(true),
});

export const tenantDefaultHoursSchema = z.object({
  defaultOpeningTime: timeFormatSchema.optional(),
  defaultClosingTime: timeFormatSchema.optional(),
});

// Counter schemas
export const createCounterSchema = z.object({
  branchId: uuidSchema,
  number: z.number().int().min(1).max(100),
  label: z.string().max(50).optional().nullable(),
  serviceIds: z.array(uuidSchema).min(1, 'At least one service must be assigned'),
});

export const updateCounterSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  status: counterStatusSchema.optional(),
  serviceIds: z.array(uuidSchema).optional(),
  assignedUserId: uuidSchema.optional().nullable(),
});

export const counterConfigSchema = z.object({
  targetCount: z.number().int().min(1).max(50),
});

// Service Category schemas
export const createServiceCategorySchema = z.object({
  branchId: uuidSchema,
  nameAr: z.string().min(2).max(100),
  nameFr: z.string().min(2).max(100),
  prefix: z
    .string()
    .length(1)
    .regex(/^[A-Z]$/, 'Prefix must be a single uppercase letter'),
  icon: z.string().max(50).optional().nullable(),
  priorityWeight: z.number().int().min(1).max(10).default(1),
  avgServiceTime: z.number().int().min(1).max(120).default(10),
  useAutomaticServiceTime: z.boolean().default(false), // auto-calculate from last 24h data
});

export const updateServiceCategorySchema = createServiceCategorySchema
  .omit({ branchId: true })
  .extend({
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(100).optional(),
    showOnKiosk: z.boolean().optional(),
    descriptionFr: z.string().max(200).optional().nullable(),
    descriptionAr: z.string().max(200).optional().nullable(),
    serviceGroup: z.string().max(100).optional().nullable(),
  })
  .partial();

// Service Template schemas (Bank-level reusable service definitions)
export const createServiceTemplateSchema = z.object({
  nameAr: z.string().min(2).max(100),
  nameFr: z.string().min(2).max(100),
  prefix: z
    .string()
    .length(1)
    .regex(/^[A-Z]$/, 'Prefix must be a single uppercase letter'),
  icon: z.string().max(50).optional().nullable(),
  priorityWeight: z.number().int().min(1).max(10).default(1),
  avgServiceTime: z.number().int().min(1).max(120).default(10),
  descriptionFr: z.string().max(200).optional().nullable(),
  descriptionAr: z.string().max(200).optional().nullable(),
  serviceGroup: z.string().max(100).optional().nullable(),
  subServicesFr: z.array(z.string().max(100)).max(10).default([]),
  subServicesAr: z.array(z.string().max(100)).max(10).default([]),
  displayOrder: z.number().int().min(0).max(100).default(0),
  showOnKiosk: z.boolean().default(true),
});

export const updateServiceTemplateSchema = createServiceTemplateSchema.partial();

export const copyTemplatesToBranchSchema = z.object({
  branchId: uuidSchema,
  templateIds: z.array(uuidSchema).min(1, 'Select at least one template'),
});

// Bulk deploy to multiple branches/groups
export const bulkDeploySchema = z.object({
  templateIds: z.array(uuidSchema).min(1, 'Select at least one template'),
  branchIds: z.array(uuidSchema).optional(),
  groupIds: z.array(uuidSchema).optional(),
}).refine(
  (d) => (d.branchIds && d.branchIds.length > 0) || (d.groupIds && d.groupIds.length > 0),
  { message: 'Must specify at least one branch or group' }
);

// Branch Group schemas
export const createBranchGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
});

export const updateBranchGroupSchema = createBranchGroupSchema.partial();

export const branchGroupMembershipSchema = z.object({
  branchIds: z.array(uuidSchema).min(1, 'Select at least one branch'),
});

// Service field reset (reset overridden field to template value)
export const resetServiceFieldSchema = z.object({
  field: z.enum(['nameFr', 'nameAr', 'icon', 'descriptionFr', 'descriptionAr', 'serviceGroup', 'subServicesFr', 'subServicesAr']),
});

// Template sync schema
export const syncTemplateSchema = z.object({
  force: z.boolean().default(false), // Force sync even overridden fields
});

// Complete Branch Creation Schema (Wizard)
export const createBranchCompleteSchema = z.object({
  // Branch details
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  address: z.string().max(500).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  timezone: z.string().default('Africa/Tunis'),
  notifyAtPosition: z.number().int().min(1).max(10).default(2),

  // Services (template IDs to copy)
  templateIds: z.array(uuidSchema).min(1, 'At least one service is required'),

  // Counters
  counterCount: z.number().int().min(1).max(50),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema,
  branchId: uuidSchema.optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  role: userRoleSchema.optional(),
  branchId: uuidSchema.optional().nullable(),
  status: entityStatusSchema.optional(),
});

// Queue/Ticket schemas
export const checkinSchema = z.object({
  branchId: uuidSchema,
  serviceCategoryId: uuidSchema,
  customerPhone: phoneSchema.optional().nullable(),
  notificationChannel: notificationChannelSchema.optional().default(NOTIFICATION_CHANNEL.NONE),
  priority: ticketPrioritySchema.optional().default(TICKET_PRIORITY.NORMAL),
  checkinMethod: checkinMethodSchema.optional().default(CHECKIN_METHOD.KIOSK),
});

export const callNextSchema = z.object({
  counterId: uuidSchema,
});

export const transferTicketSchema = z.object({
  targetServiceCategoryId: uuidSchema,
  notes: z.string().max(500).optional(),
});

export const completeTicketSchema = z.object({
  notes: z.string().max(500).optional(),
});

// Analytics query schemas
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const analyticsQuerySchema = dateRangeSchema.extend({
  branchId: uuidSchema.optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Socket.IO schemas
export const joinBranchSchema = z.object({
  branchId: uuidSchema,
  token: z.string().optional(),
});

export const joinTicketSchema = z.object({
  ticketId: uuidSchema,
});

// Type exports from schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type CreateCounterInput = z.infer<typeof createCounterSchema>;
export type UpdateCounterInput = z.infer<typeof updateCounterSchema>;
export type CounterConfigInput = z.infer<typeof counterConfigSchema>;
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>;
export type CreateServiceTemplateInput = z.infer<typeof createServiceTemplateSchema>;
export type UpdateServiceTemplateInput = z.infer<typeof updateServiceTemplateSchema>;
export type CopyTemplatesToBranchInput = z.infer<typeof copyTemplatesToBranchSchema>;
export type BulkDeployInput = z.infer<typeof bulkDeploySchema>;
export type CreateBranchGroupInput = z.infer<typeof createBranchGroupSchema>;
export type UpdateBranchGroupInput = z.infer<typeof updateBranchGroupSchema>;
export type BranchGroupMembershipInput = z.infer<typeof branchGroupMembershipSchema>;
export type ResetServiceFieldInput = z.infer<typeof resetServiceFieldSchema>;
export type SyncTemplateInput = z.infer<typeof syncTemplateSchema>;
export type CreateBranchCompleteInput = z.infer<typeof createBranchCompleteSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type CallNextInput = z.infer<typeof callNextSchema>;
export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
export type CompleteTicketInput = z.infer<typeof completeTicketSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type OperatingHoursInput = z.infer<typeof operatingHoursSchema>;
export type TenantDefaultHoursInput = z.infer<typeof tenantDefaultHoursSchema>;
