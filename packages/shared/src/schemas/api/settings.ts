import { z } from "zod";

import { optionalPhoneSchema, roleSchema, taxModeSchema } from "./common.js";

const referenceNameSchema = z.string().trim().min(2).max(80);
export const supportedPaymentMethodNames = ["Наличные", "Перевод"] as const;
export type SupportedPaymentMethodName = (typeof supportedPaymentMethodNames)[number];

export function isSupportedPaymentMethodName(name: string): name is SupportedPaymentMethodName {
  return (supportedPaymentMethodNames as readonly string[]).includes(name.trim());
}

const paymentMethodNameSchema = referenceNameSchema.refine(isSupportedPaymentMethodName, {
  message: "Payment method must be Наличные or Перевод"
});
const sortOrderSchema = z.number().int().min(0).max(10_000).optional();
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable()
  .optional();

export const organizationSettingsResponseSchema = z.object({
  id: z.string(),
  taxMode: taxModeSchema,
  selfEmployedIndividualRateBps: z.literal(400),
  selfEmployedBusinessRateBps: z.literal(600),
  updatedAt: z.string()
});

export const updateTaxSettingsSchema = z.object({
  taxMode: taxModeSchema
});

export const paymentMethodResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const paymentMethodListResponseSchema = z.object({
  items: z.array(paymentMethodResponseSchema)
});

export const createPaymentMethodSchema = z.object({
  name: paymentMethodNameSchema,
  sortOrder: sortOrderSchema
});

export const updatePaymentMethodSchema = z.object({
  name: paymentMethodNameSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: sortOrderSchema
});

export const expenseCategoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const expenseCategoryListResponseSchema = z.object({
  items: z.array(expenseCategoryResponseSchema)
});

export const createExpenseCategorySchema = z.object({
  name: referenceNameSchema,
  color: colorSchema,
  sortOrder: sortOrderSchema
});

export const updateExpenseCategorySchema = z.object({
  name: referenceNameSchema.optional(),
  color: colorSchema,
  isActive: z.boolean().optional(),
  sortOrder: sortOrderSchema
});

export const memberResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: roleSchema,
  commissionPercent: z.number().min(0).max(100).nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const memberListResponseSchema = z.object({
  items: z.array(memberResponseSchema)
});

export const createMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: optionalPhoneSchema,
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
  password: z.string().min(8).optional()
});

export const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: optionalPhoneSchema,
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
  isActive: z.boolean().optional()
});

export const masterListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string()
    })
  )
});

export type OrganizationSettingsResponse = z.infer<typeof organizationSettingsResponseSchema>;
export type UpdateTaxSettingsInput = z.infer<typeof updateTaxSettingsSchema>;
export type PaymentMethodResponse = z.infer<typeof paymentMethodResponseSchema>;
export type PaymentMethodListResponse = z.infer<typeof paymentMethodListResponseSchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type ExpenseCategoryResponse = z.infer<typeof expenseCategoryResponseSchema>;
export type ExpenseCategoryListResponse = z.infer<typeof expenseCategoryListResponseSchema>;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;
export type MemberResponse = z.infer<typeof memberResponseSchema>;
export type MemberListResponse = z.infer<typeof memberListResponseSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MasterListResponse = z.infer<typeof masterListResponseSchema>;
