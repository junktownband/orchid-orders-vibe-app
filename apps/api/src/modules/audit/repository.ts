import { type AuditAction, Prisma, prisma } from "@orchid/db";

const financeAuditEntityTypes = [
  "FinanceOperation",
  "Expense",
  "RepairOrder",
  "RepairOrderItem",
  "PaymentMethod",
  "ExpenseCategory"
] as const;

function auditJson(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function createAuditLogEntry(data: {
  organizationId: string;
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeJson?: unknown;
  afterJson?: unknown;
  comment?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId ?? null,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      beforeJson: auditJson(data.beforeJson),
      afterJson: auditJson(data.afterJson),
      comment: data.comment ?? null
    }
  });
}

export async function listAuditLogs(
  organizationId: string,
  options: {
    scope?: "finance";
    entityType?: string;
    entityId?: string;
    action?: AuditAction;
    limit: number;
  }
) {
  const entityType = options.entityType
    ? options.entityType
    : options.scope === "finance"
      ? { in: Array.from(financeAuditEntityTypes) }
      : undefined;

  return prisma.auditLog.findMany({
    where: {
      organizationId,
      entityType,
      entityId: options.entityId,
      action: options.action
    },
    include: {
      user: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: options.limit
  });
}
