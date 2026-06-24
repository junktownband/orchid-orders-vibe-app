import { z } from "zod";

import {
  expenseKindSchema,
  expenseStatusSchema,
  moneyCentsSchema,
  positiveMoneyCentsSchema
} from "./common.js";

export const createExpenseSchema = z.object({
  categoryId: z.string().optional(),
  kind: z.never().optional(),
  repairOrderId: z.string().optional(),
  repairOrderItemId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  amountCents: positiveMoneyCentsSchema,
  spentAt: z.string().datetime().optional(),
  spentByName: z.string().optional(),
  description: z.string().min(2),
  comment: z.string().optional()
});

export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const expenseResponseSchema = z.object({
  id: z.string(),
  amountCents: moneyCentsSchema,
  spentAt: z.string(),
  spentByName: z.string().nullable(),
  description: z.string(),
  kind: expenseKindSchema,
  status: expenseStatusSchema,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  categoryColor: z.string().nullable(),
  paymentMethodId: z.string().nullable(),
  paymentMethodName: z.string().nullable(),
  repairOrderId: z.string().nullable(),
  repairOrderNumber: z.string().nullable(),
  repairOrderItemId: z.string().nullable(),
  repairOrderItemName: z.string().nullable(),
  voidedAt: z.string().nullable(),
  voidReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const expenseListResponseSchema = z.object({
  items: z.array(expenseResponseSchema)
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type VoidExpenseInput = z.infer<typeof voidExpenseSchema>;
export type ExpenseResponse = z.infer<typeof expenseResponseSchema>;
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;
