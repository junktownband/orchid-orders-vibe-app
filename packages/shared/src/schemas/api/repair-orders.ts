import { z } from "zod";

import {
  commissionPayoutStatusSchema,
  moneyCentsSchema,
  optionalPhoneSchema,
  paymentStatusSchema,
  positiveMoneyCentsSchema,
  repairStatusSchema,
  serviceTypeSchema,
  taxModeSchema,
  taxSubjectSchema
} from "./common.js";

export const repairOrderItemInputSchema = z.object({
  serviceCatalogItemId: z.string().optional(),
  assignedMasterMembershipId: z.string().nullable().optional(),
  name: z.string().min(2),
  type: serviceTypeSchema.default("SERVICE"),
  priceCents: positiveMoneyCentsSchema,
  costCents: moneyCentsSchema.default(0)
});

export const createRepairOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2),
    phone: optionalPhoneSchema,
    email: z.string().email().optional().or(z.literal(""))
  }),
  instrument: z
    .object({
      type: z.string().min(1).optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      note: z.string().optional()
    })
    .optional(),
  description: z.string().min(3),
  totalAmountCents: positiveMoneyCentsSchema.optional(),
  items: z.array(repairOrderItemInputSchema).min(1).optional(),
  assignedMasterMembershipId: z.string().optional(),
  acceptedAt: z.string().datetime().optional(),
  comment: z.string().optional()
});

export const assignRepairOrderMasterSchema = z.object({
  assignedMasterMembershipId: z.string().nullable().optional()
});

export const updateRepairOrderItemInputSchema = repairOrderItemInputSchema.extend({
  id: z.string().optional()
});

export const updateRepairOrderItemsSchema = z.object({
  items: z.array(updateRepairOrderItemInputSchema).min(1)
});

export const updateRepairOrderStatusSchema = z.object({
  repairStatus: repairStatusSchema
});

export const issueRepairOrderSchema = z.object({
  paymentMethodId: z.string().optional(),
  taxSubject: taxSubjectSchema.optional()
});

export const addRepairOrderPaymentSchema = z.object({
  amountCents: positiveMoneyCentsSchema.optional(),
  paymentMethodId: z.string().min(1),
  comment: z.string().max(500).optional()
});

export const voidRepairOrderPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const repairOrderTabSchema = z.enum(["all", "ready", "active", "completed"]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid date");

export const repairOrdersQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    tab: repairOrderTabSchema.default("all"),
    repairStatus: repairStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    createdFrom: dateOnlySchema.optional(),
    createdTo: dateOnlySchema.optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
  .refine(
    (query) =>
      !query.createdFrom ||
      !query.createdTo ||
      new Date(`${query.createdFrom}T00:00:00.000Z`) <= new Date(`${query.createdTo}T00:00:00.000Z`),
    {
      message: "Invalid date range",
      path: ["createdTo"]
    }
  );

export const repairOrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  title: z.string().nullable(),
  description: z.string(),
  totalAmountCents: moneyCentsSchema,
  totalCostCents: moneyCentsSchema,
  grossProfitCents: z.number().int(),
  repairStatus: repairStatusSchema,
  paymentStatus: paymentStatusSchema,
  paidAmountCents: moneyCentsSchema,
  balanceDueCents: z.number().int(),
  paidAt: z.string().nullable(),
  issuedAt: z.string().nullable(),
  taxModeSnapshot: taxModeSchema.nullable(),
  taxSubject: taxSubjectSchema.nullable(),
  taxRateBps: z.number().int().nullable(),
  taxAmountCents: moneyCentsSchema.nullable(),
  paidByName: z.string().nullable(),
  assignedMasterMembershipId: z.string().nullable(),
  assignedMasterName: z.string().nullable(),
  customerId: z.string().nullable(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerNote: z.string().nullable(),
  instrumentName: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      serviceCatalogItemId: z.string().nullable(),
      assignedMasterMembershipId: z.string().nullable(),
      assignedMasterName: z.string().nullable(),
      name: z.string(),
      type: serviceTypeSchema,
      priceCents: moneyCentsSchema,
      costCents: moneyCentsSchema,
      commissionPercentSnapshot: z.number().nullable(),
      commissionBaseCents: moneyCentsSchema.nullable(),
      commissionAmountCents: moneyCentsSchema.nullable(),
      commissionCalculatedAt: z.string().nullable(),
      commissionPayoutStatus: commissionPayoutStatusSchema,
      commissionPaidAt: z.string().nullable(),
      commissionPaidByName: z.string().nullable()
    })
  ),
  payments: z.array(
    z.object({
      id: z.string(),
      amountCents: moneyCentsSchema,
      paidAt: z.string(),
      paymentMethodId: z.string().nullable(),
      paymentMethodName: z.string().nullable(),
      acceptedByName: z.string().nullable(),
      comment: z.string().nullable()
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const repairOrdersListResponseSchema = z.object({
  items: z.array(repairOrderResponseSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean()
});

export type CreateRepairOrderInput = z.infer<typeof createRepairOrderSchema>;
export type AssignRepairOrderMasterInput = z.infer<typeof assignRepairOrderMasterSchema>;
export type UpdateRepairOrderItemsInput = z.infer<typeof updateRepairOrderItemsSchema>;
export type UpdateRepairOrderStatusInput = z.infer<typeof updateRepairOrderStatusSchema>;
export type IssueRepairOrderInput = z.infer<typeof issueRepairOrderSchema>;
export type AddRepairOrderPaymentInput = z.infer<typeof addRepairOrderPaymentSchema>;
export type VoidRepairOrderPaymentInput = z.infer<typeof voidRepairOrderPaymentSchema>;
export type RepairOrdersQuery = z.infer<typeof repairOrdersQuerySchema>;
export type RepairOrderTab = z.infer<typeof repairOrderTabSchema>;
export type RepairOrderItemInput = z.infer<typeof repairOrderItemInputSchema>;
export type UpdateRepairOrderItemInput = z.infer<typeof updateRepairOrderItemInputSchema>;
export type RepairOrderResponse = z.infer<typeof repairOrderResponseSchema>;
export type RepairOrdersListResponse = z.infer<typeof repairOrdersListResponseSchema>;
