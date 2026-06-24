import { z } from "zod";

import { commissionPayoutStatusSchema, moneyCentsSchema } from "./common.js";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid date");

export const masterCommissionQuerySchema = z
  .object({
    masterMembershipId: z.string().min(1).optional(),
    payoutStatus: commissionPayoutStatusSchema.optional(),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional()
  })
  .refine(
    (query) => !query.from || !query.to || new Date(`${query.from}T00:00:00.000Z`) <= new Date(`${query.to}T00:00:00.000Z`),
    {
      message: "Invalid date range",
      path: ["to"]
    }
  );

export const masterCommissionResponseSchema = z.object({
  id: z.string(),
  repairOrderId: z.string(),
  repairOrderNumber: z.string(),
  repairOrderItemId: z.string(),
  repairOrderItemName: z.string(),
  masterMembershipId: z.string().nullable(),
  masterName: z.string().nullable(),
  customerName: z.string().nullable(),
  commissionBaseCents: moneyCentsSchema,
  commissionAmountCents: moneyCentsSchema,
  commissionPercentSnapshot: z.number().nullable(),
  commissionCalculatedAt: z.string().nullable(),
  commissionPayoutStatus: commissionPayoutStatusSchema,
  commissionPaidAt: z.string().nullable(),
  commissionPaidByName: z.string().nullable(),
  issuedAt: z.string().nullable()
});

export const masterCommissionListResponseSchema = z.object({
  items: z.array(masterCommissionResponseSchema),
  totals: z.object({
    accruedCents: moneyCentsSchema,
    paidCents: moneyCentsSchema,
    unpaidCents: moneyCentsSchema
  })
});

export const markMasterCommissionsPaidSchema = z.object({
  repairOrderItemIds: z.array(z.string().min(1)).min(1).max(1000)
});

export const masterCommissionBulkPayoutResponseSchema = z.object({
  items: z.array(masterCommissionResponseSchema),
  paidCount: z.number().int().nonnegative(),
  paidCents: moneyCentsSchema
});

export type MasterCommissionResponse = z.infer<typeof masterCommissionResponseSchema>;
export type MasterCommissionListResponse = z.infer<typeof masterCommissionListResponseSchema>;
export type MasterCommissionQuery = z.infer<typeof masterCommissionQuerySchema>;
export type MarkMasterCommissionsPaidInput = z.infer<typeof markMasterCommissionsPaidSchema>;
export type MasterCommissionBulkPayoutResponse = z.infer<typeof masterCommissionBulkPayoutResponseSchema>;
