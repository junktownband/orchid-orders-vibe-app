import { z } from "zod";

import {
  catalogServiceTypeSchema,
  moneyCentsSchema,
  positiveMoneyCentsSchema,
  serviceTypeSchema
} from "./common.js";

export const createServiceCatalogItemSchema = z.object({
  name: z.string().min(2),
  type: catalogServiceTypeSchema.default("SERVICE"),
  defaultPriceCents: positiveMoneyCentsSchema,
  defaultCostCents: moneyCentsSchema.default(0)
});

export const updateServiceCatalogItemSchema = z.object({
  name: z.string().min(2).optional(),
  defaultPriceCents: positiveMoneyCentsSchema.optional(),
  defaultCostCents: moneyCentsSchema.optional(),
  isActive: z.boolean().optional()
});

export const serviceCatalogItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: serviceTypeSchema,
  defaultPriceCents: moneyCentsSchema,
  defaultCostCents: moneyCentsSchema,
  isActive: z.boolean()
});

export const serviceCatalogListResponseSchema = z.object({
  items: z.array(serviceCatalogItemResponseSchema)
});

export type CreateServiceCatalogItemInput = z.infer<typeof createServiceCatalogItemSchema>;
export type UpdateServiceCatalogItemInput = z.infer<typeof updateServiceCatalogItemSchema>;
export type ServiceCatalogItemResponse = z.infer<typeof serviceCatalogItemResponseSchema>;
export type ServiceCatalogListResponse = z.infer<typeof serviceCatalogListResponseSchema>;
