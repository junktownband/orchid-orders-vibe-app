import { z } from "zod";

import { moneyCentsSchema, repairStatusSchema } from "./common.js";

export const dashboardResponseSchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string()
  }),
  kpis: z.object({
    paidRevenueCents: moneyCentsSchema,
    paidCostCents: moneyCentsSchema,
    grossProfitCents: z.number().int(),
    accruedRevenueCents: moneyCentsSchema,
    confirmedExpensesCents: moneyCentsSchema,
    accruedCommissionsCents: moneyCentsSchema,
    paidCommissionsCents: moneyCentsSchema,
    payableCommissionsCents: moneyCentsSchema,
    netCashCents: z.number().int(),
    repairOrdersCount: z.number().int().nonnegative(),
    paidOrdersCount: z.number().int().nonnegative(),
    unpaidOrdersCount: z.number().int().nonnegative(),
    averagePaidTicketCents: moneyCentsSchema
  }),
  resale: z.object({
    revenueCents: moneyCentsSchema,
    costCents: moneyCentsSchema,
    grossProfitCents: z.number().int(),
    marginPercent: z.number()
  }),
  repairsByStatus: z.array(
    z.object({
      status: repairStatusSchema,
      count: z.number().int().nonnegative()
    })
  )
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
