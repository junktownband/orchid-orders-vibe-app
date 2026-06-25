import { z } from "zod";

import { moneyCentsSchema, positiveMoneyCentsSchema } from "./common.js";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid date");

export const financeOperationTypeSchema = z.enum(["DEPOSIT", "WITHDRAWAL"]);
export const financeOperationSourceSchema = z.enum(["PAYMENT", "EXPENSE", "MANUAL"]);
export const financeOperationDirectionSchema = z.enum(["IN", "OUT"]);
export const financeOperationLabelSchema = z.enum([
  "PAYMENT_RECEIVED",
  "EXPENSE_CONFIRMED",
  "SALARY_PAYOUT",
  "TAX_EXPENSE",
  "DEPOSIT",
  "WITHDRAWAL"
]);

export const financeQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(80)
  })
  .refine(
    (query) => !query.from || !query.to || new Date(`${query.from}T00:00:00.000Z`) <= new Date(`${query.to}T00:00:00.000Z`),
    {
      message: "Invalid date range",
      path: ["to"]
    }
  );

export const createFinanceOperationSchema = z.object({
  type: financeOperationTypeSchema,
  amountCents: positiveMoneyCentsSchema,
  occurredAt: z.string().datetime().optional(),
  description: z.string().trim().min(2).max(160),
  comment: z.string().trim().max(500).optional()
});

export const financeOperationResponseSchema = z.object({
  id: z.string(),
  source: financeOperationSourceSchema,
  type: financeOperationLabelSchema,
  direction: financeOperationDirectionSchema,
  amountCents: moneyCentsSchema,
  signedAmountCents: z.number().int(),
  occurredAt: z.string(),
  description: z.string(),
  counterpartyName: z.string().nullable(),
  repairOrderId: z.string().nullable(),
  repairOrderNumber: z.string().nullable(),
  createdByName: z.string().nullable(),
  comment: z.string().nullable()
});

export const financeMasterCommissionResponseSchema = z.object({
  masterMembershipId: z.string().nullable(),
  masterName: z.string(),
  accruedCents: moneyCentsSchema,
  paidCents: moneyCentsSchema,
  payableCents: moneyCentsSchema,
  accruedItemsCount: z.number().int().nonnegative(),
  paidItemsCount: z.number().int().nonnegative(),
  payableItemsCount: z.number().int().nonnegative()
});

export const financeOverviewResponseSchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string()
  }),
  account: z.object({
    balanceCents: z.number().int(),
    availableAfterObligationsCents: z.number().int(),
    cashGapRiskCents: moneyCentsSchema
  }),
  summary: z.object({
    paidRevenueCents: moneyCentsSchema,
    paidCostCents: moneyCentsSchema,
    grossProfitCents: z.number().int(),
    confirmedExpensesCents: moneyCentsSchema,
    paidCommissionsCents: moneyCentsSchema,
    payableCommissionsCents: moneyCentsSchema,
    manualInflowCents: moneyCentsSchema,
    manualOutflowCents: moneyCentsSchema,
    netMovementCents: z.number().int(),
    repairOrdersCount: z.number().int().nonnegative(),
    paidOrdersCount: z.number().int().nonnegative(),
    averagePaidTicketCents: moneyCentsSchema
  }),
  masterCommissions: z.array(financeMasterCommissionResponseSchema),
  operations: z.array(financeOperationResponseSchema)
});

export type FinanceOperationType = z.infer<typeof financeOperationTypeSchema>;
export type FinanceOperationResponse = z.infer<typeof financeOperationResponseSchema>;
export type FinanceMasterCommissionResponse = z.infer<typeof financeMasterCommissionResponseSchema>;
export type FinanceOverviewResponse = z.infer<typeof financeOverviewResponseSchema>;
export type FinanceQuery = z.infer<typeof financeQuerySchema>;
export type CreateFinanceOperationInput = z.infer<typeof createFinanceOperationSchema>;
