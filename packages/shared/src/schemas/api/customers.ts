import { z } from "zod";

import { optionalPhoneSchema } from "./common.js";

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: optionalPhoneSchema.nullable(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  note: z.string().nullable().optional()
});

export const customerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  note: z.string().nullable(),
  updatedAt: z.string()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerResponse = z.infer<typeof customerResponseSchema>;
