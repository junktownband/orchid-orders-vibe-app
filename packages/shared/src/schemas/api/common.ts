import { z } from "zod";

import { apiErrorCodes } from "../../constants/errors.js";

export const moneyCentsSchema = z.number().int().nonnegative();
export const positiveMoneyCentsSchema = z.number().int().positive();

export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string()
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      apiErrorCodes.validation,
      apiErrorCodes.unauthorized,
      apiErrorCodes.forbidden,
      apiErrorCodes.notFound,
      apiErrorCodes.conflict,
      apiErrorCodes.businessRuleViolation,
      apiErrorCodes.internal
    ]),
    message: z.string(),
    details: z.array(z.unknown()).default([]),
    errors: z.array(fieldErrorSchema).default([])
  })
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("orchid-control-api")
});

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) {
      return true;
    }

    const digits = phoneDigits(value);

    return digits.length >= 10 && digits.length <= 15;
  }, "Invalid phone number");

export const repairStatusSchema = z.enum([
  "ACCEPTED",
  "IN_PROGRESS",
  "READY",
  "ISSUED",
  "CANCELLED"
]);

export const paymentStatusSchema = z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "VOIDED"]);
export const expenseStatusSchema = z.enum(["DRAFT", "CONFIRMED", "VOIDED"]);
export const expenseKindSchema = z.enum(["REGULAR", "TAX", "SALARY"]);
export const commissionPayoutStatusSchema = z.enum(["UNPAID", "PAID"]);

export const serviceTypeSchema = z.enum(["SERVICE", "MATERIAL", "STRINGS", "PART", "OTHER"]);
export const catalogServiceTypeSchema = z.enum(["SERVICE"]);
export const taxModeSchema = z.enum(["NONE", "SELF_EMPLOYED"]);
export const taxSubjectSchema = z.enum(["INDIVIDUAL", "BUSINESS"]);
export const roleSchema = z.enum(["OWNER", "ADMIN", "MANAGER", "MASTER"]);
export const auditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "VOID",
  "CONFIRM",
  "LOGIN",
  "STATUS_CHANGE",
  "PAYMENT_ADDED",
  "PAYMENT_VOIDED",
  "ISSUE",
  "COMMISSION_PAID",
  "COMMISSION_OVERRIDE"
]);

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
export type FieldError = z.infer<typeof fieldErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type TaxMode = z.infer<typeof taxModeSchema>;
export type TaxSubject = z.infer<typeof taxSubjectSchema>;
export type UserRole = z.infer<typeof roleSchema>;
export type ExpenseKind = z.infer<typeof expenseKindSchema>;
export type CommissionPayoutStatus = z.infer<typeof commissionPayoutStatusSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
