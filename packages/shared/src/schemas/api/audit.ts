import { z } from "zod";

import { auditActionSchema } from "./common.js";

export const auditLogResponseSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: auditActionSchema,
  userName: z.string().nullable(),
  beforeJson: z.unknown().nullable(),
  afterJson: z.unknown().nullable(),
  comment: z.string().nullable(),
  createdAt: z.string()
});

export const auditLogListResponseSchema = z.object({
  items: z.array(auditLogResponseSchema)
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;
