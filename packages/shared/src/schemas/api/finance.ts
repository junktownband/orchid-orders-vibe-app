import { z } from "zod";

import { moneyCentsSchema, paymentStatusSchema, positiveMoneyCentsSchema, repairStatusSchema } from "./common.js";

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
  paymentMethodId: z.string().min(1),
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
  paymentMethodId: z.string().nullable(),
  paymentMethodName: z.string().nullable(),
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

export const financeReceivableOrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string().nullable(),
  instrumentName: z.string().nullable(),
  repairStatus: repairStatusSchema,
  paymentStatus: paymentStatusSchema,
  totalAmountCents: moneyCentsSchema,
  paidAmountCents: moneyCentsSchema,
  balanceDueCents: moneyCentsSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

const financeServiceBucketSchema = z.object({
  count: z.number().int().nonnegative(),
  revenueCents: moneyCentsSchema,
  grossProfitCents: z.number().int()
});

export const financeMasterWorkResponseSchema = z.object({
  masterMembershipId: z.string().nullable(),
  masterName: z.string(),
  servicesCount: z.number().int().nonnegative(),
  standardServicesCount: z.number().int().nonnegative(),
  customServicesCount: z.number().int().nonnegative(),
  revenueCents: moneyCentsSchema,
  grossProfitCents: z.number().int(),
  commissionCents: moneyCentsSchema
});

export const financeExpenseBreakdownResponseSchema = z.object({
  key: z.string(),
  label: z.string(),
  amountCents: moneyCentsSchema,
  count: z.number().int().nonnegative()
});

export const financePaymentMethodBreakdownResponseSchema = z.object({
  key: z.string(),
  label: z.string(),
  inflowCents: moneyCentsSchema,
  outflowCents: moneyCentsSchema,
  netCents: z.number().int(),
  count: z.number().int().nonnegative()
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
    unpaidOrdersCount: z.number().int().nonnegative(),
    partiallyPaidOrdersCount: z.number().int().nonnegative(),
    receivablesCents: moneyCentsSchema,
    averagePaidTicketCents: moneyCentsSchema
  }),
  analytics: z.object({
    serviceMix: z.object({
      standard: financeServiceBucketSchema,
      custom: financeServiceBucketSchema
    }),
    masterWorks: z.array(financeMasterWorkResponseSchema),
    paymentMethods: z.array(financePaymentMethodBreakdownResponseSchema),
    expensesByCategory: z.array(financeExpenseBreakdownResponseSchema),
    expensesByCreator: z.array(financeExpenseBreakdownResponseSchema)
  }),
  masterCommissions: z.array(financeMasterCommissionResponseSchema),
  receivableOrders: z.array(financeReceivableOrderResponseSchema),
  operations: z.array(financeOperationResponseSchema)
});

export type FinanceOperationType = z.infer<typeof financeOperationTypeSchema>;
export type FinanceOperationResponse = z.infer<typeof financeOperationResponseSchema>;
export type FinanceMasterCommissionResponse = z.infer<typeof financeMasterCommissionResponseSchema>;
export type FinanceReceivableOrderResponse = z.infer<typeof financeReceivableOrderResponseSchema>;
export type FinanceMasterWorkResponse = z.infer<typeof financeMasterWorkResponseSchema>;
export type FinanceExpenseBreakdownResponse = z.infer<typeof financeExpenseBreakdownResponseSchema>;
export type FinancePaymentMethodBreakdownResponse = z.infer<typeof financePaymentMethodBreakdownResponseSchema>;
export type FinanceOverviewResponse = z.infer<typeof financeOverviewResponseSchema>;
export type FinanceQuery = z.infer<typeof financeQuerySchema>;
export type CreateFinanceOperationInput = z.infer<typeof createFinanceOperationSchema>;
