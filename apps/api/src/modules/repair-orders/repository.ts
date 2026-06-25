import {
  ExpenseKind,
  ExpenseStatus,
  CommissionPayoutStatus,
  PaymentStatus,
  Prisma,
  prisma,
  RepairStatus,
  Role,
  type ServiceType,
  type TaxMode,
  type TaxSubject
} from "@orchid/db";

import {
  allocateFinalRevenueByItem,
  allocateTaxByItem,
  calculateServiceCommissionBaseCents
} from "./commission-calculation.js";
import { normalizePhoneDigits, orderNumberSearchTerms } from "./search.js";

export { calculateServiceCommissionBaseCents } from "./commission-calculation.js";
export { orderNumberSearchTerms } from "./search.js";

type RepairOrderItemData = {
  id?: string;
  serviceCatalogItemId?: string | null;
  assignedMasterMembershipId?: string | null;
  name: string;
  type: ServiceType;
  priceCents: number;
  costCents: number;
};

type RepairOrderTransaction = Prisma.TransactionClient;

export type RepairOrderListCursor = {
  sortGroup: number;
  updatedAt: Date;
  id: string;
};

export type RepairOrderListOptions = {
  q?: string;
  tab?: "all" | "ready" | "active" | "completed";
  repairStatus?: RepairStatus;
  paymentStatus?: PaymentStatus;
  createdFrom?: Date;
  createdTo?: Date;
  cursor?: RepairOrderListCursor;
  limit: number;
};

type RepairOrderIdRow = {
  id: string;
  sortGroup: number;
  updatedAt: Date;
};

const repairOrderInclude = {
  assignedMaster: {
    include: {
      user: true
    }
  },
  customer: true,
  instrument: true,
  lineItems: {
    include: {
      assignedMaster: {
        include: {
          user: true
        }
      },
      commissionPaidBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "asc" as const
    }
  },
  paidBy: true,
  payments: {
    where: {
      isVoided: false
    },
    include: {
      acceptedBy: {
        select: {
          name: true
        }
      },
      paymentMethod: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      paidAt: "asc" as const
    }
  }
};

function paymentStatusFromPaidAmount(totalAmountCents: number, paidAmountCents: number): PaymentStatus {
  if (paidAmountCents > totalAmountCents) {
    throw new Error("Payment amount exceeds order total");
  }

  if (paidAmountCents <= 0) {
    return PaymentStatus.UNPAID;
  }

  if (paidAmountCents < totalAmountCents) {
    return PaymentStatus.PARTIALLY_PAID;
  }

  return PaymentStatus.PAID;
}

export async function recalculateIssuedOrderCommissionsTx(
  tx: RepairOrderTransaction,
  organizationId: string,
  repairOrderId: string,
  now = new Date()
) {
  const order = await tx.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      organizationId,
      deletedAt: null,
      repairStatus: RepairStatus.ISSUED
    },
    select: {
      id: true,
      totalAmountCents: true,
      taxAmountCents: true,
      lineItems: {
        orderBy: {
          createdAt: "asc"
        },
        select: {
          id: true,
          type: true,
          priceCents: true,
          costCents: true,
          commissionPercentSnapshot: true,
          commissionAmountCents: true,
          commissionPayoutStatus: true,
          assignedMaster: {
            select: {
              commissionPercent: true
            }
          },
          expenses: {
            where: {
              kind: ExpenseKind.REGULAR,
              status: ExpenseStatus.CONFIRMED
            },
            select: {
              amountCents: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  const revenueByItemId = allocateFinalRevenueByItem(order.lineItems, order.totalAmountCents);
  const taxByItemId = allocateTaxByItem(
    order.lineItems,
    revenueByItemId,
    order.totalAmountCents,
    order.taxAmountCents
  );
  let actualCommissionCents = 0;

  for (const item of order.lineItems) {
    if (item.type !== "SERVICE") {
      continue;
    }

    if (item.commissionPayoutStatus === CommissionPayoutStatus.PAID) {
      actualCommissionCents += item.commissionAmountCents ?? 0;
      continue;
    }

    const itemExpenseCents = item.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
    const commissionBaseCents = calculateServiceCommissionBaseCents({
      allocatedRevenueCents: revenueByItemId.get(item.id) ?? item.priceCents,
      allocatedTaxCents: taxByItemId.get(item.id) ?? 0,
      costCents: item.costCents,
      confirmedRegularExpenseCents: itemExpenseCents
    });
    const commissionPercentSnapshot = item.commissionPercentSnapshot ?? item.assignedMaster?.commissionPercent ?? null;
    const commissionAmountCents =
      commissionPercentSnapshot !== null ? Math.round(commissionBaseCents * Number(commissionPercentSnapshot)) : null;

    await tx.repairOrderItem.update({
      where: {
        id: item.id
      },
      data: {
        commissionPercentSnapshot,
        commissionBaseCents,
        commissionAmountCents,
        commissionCalculatedAt: now,
        commissionPayoutStatus: CommissionPayoutStatus.UNPAID,
        commissionPaidAt: null,
        commissionPaidByUserId: null
      }
    });

    actualCommissionCents += commissionAmountCents ?? 0;
  }

  await tx.repairOrder.update({
    where: {
      id: order.id,
      organizationId
    },
    data: {
      actualCommissionCents
    }
  });

  return {
    repairOrderId: order.id,
    actualCommissionCents
  };
}

function repairStatusSql(status: RepairStatus) {
  return Prisma.sql`${status}::"RepairStatus"`;
}

function paymentStatusSql(status: PaymentStatus) {
  return Prisma.sql`${status}::"PaymentStatus"`;
}

function repairOrderSortGroupSql() {
  return Prisma.sql`CASE
    WHEN ro."repairStatus" = 'READY'::"RepairStatus" THEN 0
    WHEN ro."repairStatus" IN ('ISSUED'::"RepairStatus", 'CANCELLED'::"RepairStatus") THEN 2
    ELSE 1
  END`;
}

function listWhereSql(organizationId: string, options: RepairOrderListOptions) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`ro."organizationId" = ${organizationId}`,
    Prisma.sql`ro."deletedAt" IS NULL`
  ];

  if (options.tab === "ready") {
    conditions.push(Prisma.sql`ro."repairStatus" = ${repairStatusSql(RepairStatus.READY)}`);
  }

  if (options.tab === "active") {
    conditions.push(
      Prisma.sql`ro."repairStatus" IN (${Prisma.join([
        repairStatusSql(RepairStatus.ACCEPTED),
        repairStatusSql(RepairStatus.IN_PROGRESS)
      ])})`
    );
  }

  if (options.tab === "completed") {
    conditions.push(
      Prisma.sql`ro."repairStatus" IN (${Prisma.join([
        repairStatusSql(RepairStatus.ISSUED),
        repairStatusSql(RepairStatus.CANCELLED)
      ])})`
    );
  }

  if (options.repairStatus) {
    conditions.push(Prisma.sql`ro."repairStatus" = ${repairStatusSql(options.repairStatus)}`);
  }

  if (options.paymentStatus) {
    conditions.push(Prisma.sql`ro."paymentStatus" = ${paymentStatusSql(options.paymentStatus)}`);
  }

  if (options.createdFrom) {
    conditions.push(Prisma.sql`ro."createdAt" >= ${options.createdFrom}`);
  }

  if (options.createdTo) {
    conditions.push(Prisma.sql`ro."createdAt" <= ${options.createdTo}`);
  }

  const search = options.q?.trim();

  if (search) {
    const searchTerm = `%${search}%`;
    const phoneDigits = normalizePhoneDigits(search);
    const orderNumberTerms = orderNumberSearchTerms(search);
    const orderNumberCondition =
      orderNumberTerms.length > 0
        ? Prisma.sql`OR (${Prisma.join(
            orderNumberTerms.map((term) => Prisma.sql`ro."orderNumber" ILIKE ${`%${term}%`}`),
            " OR "
          )})`
        : Prisma.empty;
    const phoneCondition = phoneDigits
      ? Prisma.sql`OR c."phoneNormalized" LIKE ${`%${phoneDigits}%`}`
      : Prisma.empty;

    conditions.push(Prisma.sql`(
      ro."orderNumber" ILIKE ${searchTerm}
      ${orderNumberCondition}
      OR c."name" ILIKE ${searchTerm}
      OR c."phone" ILIKE ${searchTerm}
      ${phoneCondition}
      OR i."brand" ILIKE ${searchTerm}
      OR i."model" ILIKE ${searchTerm}
      OR i."type" ILIKE ${searchTerm}
      OR u."name" ILIKE ${searchTerm}
    )`);
  }

  if (options.cursor) {
    conditions.push(Prisma.sql`(
      ${repairOrderSortGroupSql()} > ${options.cursor.sortGroup}
      OR (
        ${repairOrderSortGroupSql()} = ${options.cursor.sortGroup}
        AND ro."updatedAt" < ${options.cursor.updatedAt}
      )
      OR (
        ${repairOrderSortGroupSql()} = ${options.cursor.sortGroup}
        AND ro."updatedAt" = ${options.cursor.updatedAt}
        AND ro."id" < ${options.cursor.id}
      )
    )`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function encodeCursor(row: RepairOrderIdRow) {
  return Buffer.from(
    JSON.stringify({
      g: row.sortGroup,
      u: row.updatedAt.toISOString(),
      i: row.id
    })
  ).toString("base64url");
}

export function decodeRepairOrderCursor(value: string): RepairOrderListCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      g?: unknown;
      u?: unknown;
      i?: unknown;
    };

    if (typeof parsed.g !== "number" || typeof parsed.u !== "string" || typeof parsed.i !== "string") {
      return null;
    }

    const updatedAt = new Date(parsed.u);

    if (!Number.isFinite(updatedAt.getTime())) {
      return null;
    }

    return {
      sortGroup: parsed.g,
      updatedAt,
      id: parsed.i
    };
  } catch {
    return null;
  }
}

export async function listRepairOrders(organizationId: string, options: RepairOrderListOptions) {
  const take = options.limit + 1;
  const whereSql = listWhereSql(organizationId, options);
  const rows = await prisma.$queryRaw<RepairOrderIdRow[]>`
    SELECT
      ro."id",
      ${repairOrderSortGroupSql()} AS "sortGroup",
      ro."updatedAt"
    FROM "RepairOrder" ro
    LEFT JOIN "Customer" c ON c."id" = ro."customerId"
    LEFT JOIN "Instrument" i ON i."id" = ro."instrumentId"
    LEFT JOIN "Membership" m ON m."id" = ro."assignedMasterMembershipId"
    LEFT JOIN "User" u ON u."id" = m."userId"
    ${whereSql}
    ORDER BY "sortGroup" ASC, ro."updatedAt" DESC, ro."id" DESC
    LIMIT ${take}
  `;
  const pageRows = rows.slice(0, options.limit);
  const ids = pageRows.map((row) => row.id);

  if (ids.length === 0) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false
    };
  }

  const orders = await prisma.repairOrder.findMany({
    where: {
      organizationId,
      id: {
        in: ids
      },
      deletedAt: null
    },
    include: repairOrderInclude
  });
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const items = ids.flatMap((id) => {
    const order = orderById.get(id);

    return order ? [order] : [];
  });

  return {
    items,
    nextCursor: rows.length > options.limit ? encodeCursor(pageRows[pageRows.length - 1]) : null,
    hasMore: rows.length > options.limit
  };
}

export async function createRepairOrder(
  organizationId: string,
  data: {
    orderNumber: string;
    customer: {
      name: string;
      phone?: string | null;
      email?: string | null;
      note?: string | null;
    };
    instrument?: {
      type: string;
      brand?: string | null;
      model?: string | null;
      serialNumber?: string | null;
      note?: string | null;
    };
    description: string;
    totalAmountCents: number;
    totalCostCents: number;
    grossProfitCents: number;
    items: RepairOrderItemData[];
    assignedMasterMembershipId?: string | null;
    acceptedAt?: Date;
    comment?: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        ...data.customer,
        phoneNormalized: data.customer.phone ? normalizePhoneDigits(data.customer.phone) : null,
        organizationId
      }
    });

    const instrument = data.instrument
      ? await tx.instrument.create({
          data: {
            ...data.instrument,
            organizationId,
            customerId: customer.id
          }
        })
      : null;

    return tx.repairOrder.create({
      data: {
        organizationId,
        orderNumber: data.orderNumber,
        customerId: customer.id,
        instrumentId: instrument?.id,
        assignedMasterMembershipId: data.assignedMasterMembershipId,
        title: instrument ? [instrument.brand, instrument.model].filter(Boolean).join(" ") : null,
        description: data.description,
        totalAmountCents: data.totalAmountCents,
        totalCostCents: data.totalCostCents,
        grossProfitCents: data.grossProfitCents,
        repairStatus: RepairStatus.ACCEPTED,
        paymentStatus: PaymentStatus.UNPAID,
        acceptedAt: data.acceptedAt ?? new Date(),
        comment: data.comment,
        lineItems: {
          create: data.items.map((item) => ({
            organizationId,
            serviceCatalogItemId: item.serviceCatalogItemId,
            assignedMasterMembershipId: item.assignedMasterMembershipId,
            nameSnapshot: item.name,
            type: item.type,
            priceCents: item.priceCents,
            costCents: item.costCents
          }))
        }
      },
      include: repairOrderInclude
    });
  });
}

export async function findRepairOrder(organizationId: string, id: string) {
  return prisma.repairOrder.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    include: repairOrderInclude
  });
}

export async function countRepairOrders(organizationId: string) {
  return prisma.repairOrder.count({
    where: {
      organizationId
    }
  });
}

export async function addRepairOrderPayment(
  organizationId: string,
  id: string,
  data: {
    acceptedByUserId: string;
    paymentMethodId: string;
    amountCents?: number;
    comment?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.repairOrder.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      select: {
        totalAmountCents: true,
        paidAt: true,
        paidByUserId: true,
        repairStatus: true,
        payments: {
          where: {
            isVoided: false
          },
          select: {
            amountCents: true
          }
        }
      }
    });

    if (!existing) {
      throw new Error("Repair order not found");
    }

    if (existing.repairStatus === RepairStatus.ISSUED) {
      throw new Error("Repair order is issued");
    }

    const currentPaidCents = existing.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const dueCents = Math.max(existing.totalAmountCents - currentPaidCents, 0);
    const amountCents = data.amountCents ?? dueCents;

    if (amountCents <= 0) {
      throw new Error("Payment amount must be positive");
    }

    if (amountCents > dueCents) {
      throw new Error("Payment amount exceeds order total");
    }

    const nextPaidCents = currentPaidCents + amountCents;

    await tx.payment.create({
      data: {
        organizationId,
        repairOrderId: id,
        acceptedByUserId: data.acceptedByUserId,
        paymentMethodId: data.paymentMethodId,
        amountCents,
        paidAt: now,
        comment: data.comment ?? null
      }
    });

    return tx.repairOrder.update({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      data: {
        paymentStatus: paymentStatusFromPaidAmount(existing.totalAmountCents, nextPaidCents),
        paidAt: existing.paidAt ?? now,
        paidByUserId: existing.paidByUserId ?? data.acceptedByUserId
      },
      include: repairOrderInclude
    });
  });
}

export async function voidRepairOrderPayment(
  organizationId: string,
  id: string,
  paymentId: string,
  data: {
    reason: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const payment = await tx.payment.findFirst({
      where: {
        id: paymentId,
        organizationId,
        repairOrderId: id,
        isVoided: false
      },
      select: {
        id: true,
        amountCents: true,
        repairOrder: {
          select: {
            totalAmountCents: true
          }
        }
      }
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    await tx.payment.update({
      where: {
        id: payment.id,
        organizationId
      },
      data: {
        isVoided: true,
        voidReason: data.reason,
        voidedAt: now
      }
    });

    const activePayments = await tx.payment.findMany({
      where: {
        organizationId,
        repairOrderId: id,
        isVoided: false
      },
      orderBy: {
        paidAt: "asc"
      },
      select: {
        acceptedByUserId: true,
        amountCents: true,
        paidAt: true
      }
    });
    const paidAmountCents = activePayments.reduce((sum, activePayment) => sum + activePayment.amountCents, 0);
    const firstPayment = activePayments[0] ?? null;

    return tx.repairOrder.update({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      data: {
        paymentStatus: paymentStatusFromPaidAmount(payment.repairOrder.totalAmountCents, paidAmountCents),
        paidAt: firstPayment?.paidAt ?? null,
        paidByUserId: firstPayment?.acceptedByUserId ?? null
      },
      include: repairOrderInclude
    });
  });
}

export async function findMaster(organizationId: string, id: string) {
  return prisma.membership.findFirst({
    where: {
      id,
      organizationId,
      isActive: true,
      role: {
        in: [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.MASTER]
      },
      user: {
        isActive: true
      }
    }
  });
}

export async function findMastersByIds(organizationId: string, ids: string[]) {
  return prisma.membership.findMany({
    where: {
      id: {
        in: ids
      },
      organizationId,
      isActive: true,
      role: {
        in: [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.MASTER]
      },
      user: {
        isActive: true
      }
    },
    select: {
      id: true
    }
  });
}

export async function findServiceCatalogItems(organizationId: string, ids: string[]) {
  return prisma.serviceCatalogItem.findMany({
    where: {
      id: {
        in: ids
      },
      organizationId,
      deletedAt: null
    },
    select: {
      id: true
    }
  });
}

export async function updateRepairOrderMaster(
  organizationId: string,
  id: string,
  assignedMasterMembershipId: string | null
) {
  const existing = await prisma.repairOrder.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    select: {
      repairStatus: true
    }
  });

  if (!existing) {
    throw new Error("Repair order not found");
  }

  if (existing.repairStatus === RepairStatus.ISSUED) {
    throw new Error("Repair order is issued");
  }

  return prisma.repairOrder.update({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    data: {
      assignedMasterMembershipId
    },
    include: repairOrderInclude
  });
}

export async function replaceRepairOrderItems(
  organizationId: string,
  id: string,
  data: {
    totalAmountCents: number;
    totalCostCents: number;
    grossProfitCents: number;
    items: RepairOrderItemData[];
  }
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.repairOrder.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      select: {
        id: true,
        repairStatus: true,
        lineItems: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existing) {
      throw new Error("Repair order not found");
    }

    if (existing.repairStatus === RepairStatus.ISSUED) {
      throw new Error("Repair order is issued");
    }

    const existingItemIds = new Set(existing.lineItems.map((item) => item.id));
    const incomingItemIds = new Set(data.items.flatMap((item) => (item.id ? [item.id] : [])));
    const unknownItemId = [...incomingItemIds].find((itemId) => !existingItemIds.has(itemId));

    if (unknownItemId) {
      throw new Error("Repair order item not found");
    }

    const deletedItemIds = [...existingItemIds].filter((itemId) => !incomingItemIds.has(itemId));

    if (deletedItemIds.length > 0) {
      await tx.expense.updateMany({
        where: {
          organizationId,
          repairOrderId: id,
          repairOrderItemId: {
            in: deletedItemIds
          }
        },
        data: {
          repairOrderItemId: null
        }
      });

      await tx.repairOrderItem.deleteMany({
        where: {
          organizationId,
          repairOrderId: id,
          id: {
            in: deletedItemIds
          }
        }
      });
    }

    for (const item of data.items) {
      const itemData = {
        serviceCatalogItemId: item.serviceCatalogItemId ?? null,
        assignedMasterMembershipId: item.assignedMasterMembershipId ?? null,
        nameSnapshot: item.name,
        type: item.type,
        priceCents: item.priceCents,
        costCents: item.costCents
      };

      if (item.id) {
        await tx.repairOrderItem.update({
          where: {
            id: item.id,
            organizationId,
            repairOrderId: id
          },
          data: itemData
        });
      } else {
        await tx.repairOrderItem.create({
          data: {
            organizationId,
            repairOrderId: id,
            ...itemData
          }
        });
      }
    }

    return tx.repairOrder.update({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      data: {
        totalAmountCents: data.totalAmountCents,
        totalCostCents: data.totalCostCents,
        grossProfitCents: data.grossProfitCents
      },
      include: repairOrderInclude
    });
  });
}

export async function updateRepairOrderStatus(organizationId: string, id: string, repairStatus: RepairStatus) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.repairOrder.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      select: {
        repairStatus: true
      }
    });

    if (!existing) {
      throw new Error("Repair order not found");
    }

    if (existing.repairStatus === RepairStatus.ISSUED || repairStatus === RepairStatus.ISSUED) {
      throw new Error("Repair order status is locked");
    }

    return tx.repairOrder.update({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      data: {
        repairStatus,
        acceptedAt: repairStatus === RepairStatus.ACCEPTED ? now : undefined,
        completedAt: repairStatus === RepairStatus.READY ? now : undefined,
        cancelledAt: repairStatus === RepairStatus.CANCELLED ? now : undefined
      },
      include: repairOrderInclude
    });
  });
}

export async function issueRepairOrder(
  organizationId: string,
  id: string,
  data: {
    finalAmountCents: number;
    paidByUserId: string;
    paymentMethodId?: string | null;
    taxModeSnapshot?: TaxMode | null;
    taxSubject?: TaxSubject | null;
    taxRateBps?: number | null;
    taxAmountCents?: number | null;
  }
) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.repairOrder.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      select: {
        orderNumber: true,
        repairStatus: true,
        totalCostCents: true,
        paidAt: true,
        paidByUserId: true,
        payments: {
          where: {
            isVoided: false
          },
          select: {
            amountCents: true
          }
        },
        lineItems: {
          orderBy: {
            createdAt: "asc"
          },
          select: {
            id: true,
            type: true,
            priceCents: true,
            costCents: true,
            assignedMaster: {
              select: {
                commissionPercent: true
              }
            },
            expenses: {
              where: {
                kind: ExpenseKind.REGULAR,
                status: ExpenseStatus.CONFIRMED
              },
              select: {
                amountCents: true
              }
            }
          }
        }
      }
    });

    if (!existing) {
      throw new Error("Repair order not found");
    }

    if (existing.repairStatus === RepairStatus.ISSUED) {
      throw new Error("Repair order is issued");
    }

    const paidAmountCents = existing.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const paymentRemainderCents = Math.max(data.finalAmountCents - paidAmountCents, 0);

    if (paidAmountCents > data.finalAmountCents) {
      throw new Error("Payment amount exceeds order total");
    }

    if (paymentRemainderCents > 0 && !data.paymentMethodId) {
      throw new Error("Payment method is required");
    }

    const revenueByItemId = allocateFinalRevenueByItem(existing.lineItems, data.finalAmountCents);
    const taxByItemId = allocateTaxByItem(
      existing.lineItems,
      revenueByItemId,
      data.finalAmountCents,
      data.taxAmountCents
    );

    for (const item of existing.lineItems) {
      const itemExpenseCents = item.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
      const commissionBaseCents =
        item.type === "SERVICE"
          ? calculateServiceCommissionBaseCents({
              allocatedRevenueCents: revenueByItemId.get(item.id) ?? item.priceCents,
              allocatedTaxCents: taxByItemId.get(item.id) ?? 0,
              costCents: item.costCents,
              confirmedRegularExpenseCents: itemExpenseCents
            })
          : null;
      const commissionPercentSnapshot =
        item.type === "SERVICE" ? (item.assignedMaster?.commissionPercent ?? null) : null;
      const commissionAmountCents =
        commissionBaseCents !== null && commissionPercentSnapshot !== null
          ? Math.round(commissionBaseCents * Number(commissionPercentSnapshot))
          : null;

      await tx.repairOrderItem.update({
        where: {
          id: item.id
        },
        data: {
          commissionPercentSnapshot,
          commissionBaseCents,
          commissionAmountCents,
          commissionCalculatedAt: item.type === "SERVICE" ? now : null,
          commissionPayoutStatus: CommissionPayoutStatus.UNPAID,
          commissionPaidAt: null,
          commissionPaidByUserId: null
        }
      });
    }

    const actualCommissionCents = existing.lineItems.reduce((sum, item) => {
      if (item.type !== "SERVICE" || !item.assignedMaster?.commissionPercent) {
        return sum;
      }

      const itemExpenseCents = item.expenses.reduce((expenseSum, expense) => expenseSum + expense.amountCents, 0);
      const baseCents = calculateServiceCommissionBaseCents({
        allocatedRevenueCents: revenueByItemId.get(item.id) ?? item.priceCents,
        allocatedTaxCents: taxByItemId.get(item.id) ?? 0,
        costCents: item.costCents,
        confirmedRegularExpenseCents: itemExpenseCents
      });

      return sum + Math.round(baseCents * Number(item.assignedMaster.commissionPercent));
    }, 0);

    if (paymentRemainderCents > 0 && data.paymentMethodId) {
      await tx.payment.create({
        data: {
          organizationId,
          repairOrderId: id,
          acceptedByUserId: data.paidByUserId,
          paymentMethodId: data.paymentMethodId,
          amountCents: paymentRemainderCents,
          paidAt: now,
          comment: "Оплата остатка при выдаче заказа"
        }
      });
    }

    const finalPaidAmountCents = paidAmountCents + paymentRemainderCents;
    const updatedOrder = await tx.repairOrder.update({
      where: {
        id,
        organizationId,
        deletedAt: null
      },
      data: {
        totalAmountCents: data.finalAmountCents,
        grossProfitCents: data.finalAmountCents - existing.totalCostCents,
        actualCommissionCents,
        repairStatus: RepairStatus.ISSUED,
        paymentStatus: paymentStatusFromPaidAmount(data.finalAmountCents, finalPaidAmountCents),
        paidAt: existing.paidAt ?? now,
        paidByUserId: existing.paidByUserId ?? data.paidByUserId,
        taxModeSnapshot: data.taxModeSnapshot,
        taxSubject: data.taxSubject,
        taxRateBps: data.taxRateBps,
        taxAmountCents: data.taxAmountCents,
        issuedAt: now
      },
      include: repairOrderInclude
    });

    if (data.taxAmountCents && data.taxAmountCents > 0) {
      const displayOrderNumber = existing.orderNumber.replace(/^R-/i, "");

      await tx.expense.create({
        data: {
          organizationId,
          createdByUserId: data.paidByUserId,
          repairOrderId: id,
          amountCents: data.taxAmountCents,
          spentAt: now,
          description: `Налог по заказу № ${displayOrderNumber}`,
          kind: ExpenseKind.TAX,
          status: ExpenseStatus.CONFIRMED,
          confirmedAt: now,
          comment: data.taxRateBps ? `Самозанятость ${(data.taxRateBps / 100).toFixed(2)}%` : null
        }
      });
    }

    return updatedOrder;
  });
}

export async function listMasters(organizationId: string) {
  return prisma.membership.findMany({
    where: {
      organizationId,
      isActive: true,
      role: {
        in: [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.MASTER]
      },
      user: {
        isActive: true
      }
    },
    include: {
      user: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}
