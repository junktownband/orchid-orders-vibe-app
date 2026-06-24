import { apiErrorCodes, type AuditAction, type AuditLogListResponse, type AuditLogResponse } from "@orchid/shared";

import { AuthError, type AuthContext } from "../auth/service.js";
import { createAuditLogEntry, listAuditLogs } from "./repository.js";

type AuditLogRecord = Awaited<ReturnType<typeof listAuditLogs>>[number];

function assertCanViewAudit(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(record: AuditLogRecord): AuditLogResponse {
  return {
    id: record.id,
    entityType: record.entityType,
    entityId: record.entityId,
    action: record.action,
    userName: record.user?.name ?? null,
    beforeJson: record.beforeJson,
    afterJson: record.afterJson,
    comment: record.comment,
    createdAt: record.createdAt.toISOString()
  };
}

export async function writeAuditLog(auth: AuthContext, data: {
  entityType: string;
  entityId: string;
  action: Parameters<typeof createAuditLogEntry>[0]["action"];
  beforeJson?: unknown;
  afterJson?: unknown;
  comment?: string | null;
}) {
  try {
    await createAuditLogEntry({
      organizationId: auth.organizationId,
      userId: auth.userId,
      ...data
    });
  } catch (error) {
    console.warn("Audit log write failed", error);
  }
}

export async function getAuditLogs(
  auth: AuthContext,
  query: {
    entityType?: string;
    entityId?: string;
    action?: AuditAction;
    limit: number;
  }
): Promise<AuditLogListResponse> {
  assertCanViewAudit(auth);

  const items = await listAuditLogs(auth.organizationId, query);

  return {
    items: items.map(toResponse)
  };
}
