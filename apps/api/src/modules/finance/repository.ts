import {
  CommissionPayoutStatus,
  ExpenseKind,
  ExpenseStatus,
  FinanceOperationType as DbFinanceOperationType,
  PaymentStatus,
  prisma,
  RepairStatus
} from "@orchid/db";

import type { CreateFinanceOperationInput } from "@orchid/shared";

type Period = {
  from: Date;
  to: Date;
  limit: number;
};

type MasterCommissionItem = {
  assignedMasterMembershipId: string | null;
  commissionAmountCents: number | null;
  assignedMaster: {
    user: {
      name: string;
    };
  } | null;
};

type MasterCommissionBucket = {
  masterMembershipId: string | null;
  masterName: string;
  accruedCents: number;
  paidCents: number;
  payableCents: number;
  accruedItemsCount: number;
  paidItemsCount: number;
  payableItemsCount: number;
};

function sumManualGroups(
  groups: Array<{ type: DbFinanceOperationType; _sum: { amountCents: number | null } }>
) {
  return groups.reduce(
    (sum, group) => {
      const amountCents = group._sum.amountCents ?? 0;

      return {
        inflowCents: sum.inflowCents + (group.type === DbFinanceOperationType.DEPOSIT ? amountCents : 0),
        outflowCents: sum.outflowCents + (group.type === DbFinanceOperationType.WITHDRAWAL ? amountCents : 0)
      };
    },
    {
      inflowCents: 0,
      outflowCents: 0
    }
  );
}

function masterCommissionKey(item: MasterCommissionItem) {
  return item.assignedMasterMembershipId ?? "unassigned";
}

function masterCommissionName(item: MasterCommissionItem) {
  return item.assignedMaster?.user.name ?? "Без мастера";
}

function ensureMasterCommissionBucket(
  buckets: Map<string, MasterCommissionBucket>,
  item: MasterCommissionItem
) {
  const key = masterCommissionKey(item);
  const existing = buckets.get(key);

  if (existing) {
    return existing;
  }

  const bucket = {
    masterMembershipId: item.assignedMasterMembershipId,
    masterName: masterCommissionName(item),
    accruedCents: 0,
    paidCents: 0,
    payableCents: 0,
    accruedItemsCount: 0,
    paidItemsCount: 0,
    payableItemsCount: 0
  };

  buckets.set(key, bucket);

  return bucket;
}

function addMasterCommissionAmounts(
  buckets: Map<string, MasterCommissionBucket>,
  items: MasterCommissionItem[],
  amountField: "accruedCents" | "paidCents" | "payableCents",
  countField: "accruedItemsCount" | "paidItemsCount" | "payableItemsCount"
) {
  for (const item of items) {
    const bucket = ensureMasterCommissionBucket(buckets, item);

    bucket[amountField] += item.commissionAmountCents ?? 0;
    bucket[countField] += 1;
  }
}

function buildMasterCommissionBreakdown({
  accruedCommissionItems,
  paidCommissionItems,
  payableCommissionItems
}: {
  accruedCommissionItems: MasterCommissionItem[];
  paidCommissionItems: MasterCommissionItem[];
  payableCommissionItems: MasterCommissionItem[];
}) {
  const buckets = new Map<string, MasterCommissionBucket>();

  addMasterCommissionAmounts(buckets, accruedCommissionItems, "accruedCents", "accruedItemsCount");
  addMasterCommissionAmounts(buckets, paidCommissionItems, "paidCents", "paidItemsCount");
  addMasterCommissionAmounts(buckets, payableCommissionItems, "payableCents", "payableItemsCount");

  return [...buckets.values()].sort((left, right) => {
    const totalRight = right.payableCents + right.accruedCents + right.paidCents;
    const totalLeft = left.payableCents + left.accruedCents + left.paidCents;

    return totalRight - totalLeft || left.masterName.localeCompare(right.masterName, "ru");
  });
}

const masterCommissionSelect = {
  assignedMasterMembershipId: true,
  commissionAmountCents: true,
  assignedMaster: {
    select: {
      user: {
        select: {
          name: true
        }
      }
    }
  }
} satisfies Record<string, unknown>;

export async function getFinanceData(organizationId: string, period: Period) {
  const [
    allPayments,
    allConfirmedExpenses,
    allManualGroups,
    paidOrders,
    acceptedPayments,
    confirmedExpenses,
    accruedCommissionItems,
    paidCommissionItems,
    payableCommissionItems,
    periodManualGroups,
    repairOrdersCount,
    paymentOperations,
    expenseOperations,
    manualOperations
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        organizationId,
        isVoided: false
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        status: ExpenseStatus.CONFIRMED
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.financeOperation.groupBy({
      by: ["type"],
      where: {
        organizationId
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.repairOrder.findMany({
      where: {
        organizationId,
        deletedAt: null,
        repairStatus: {
          not: RepairStatus.CANCELLED
        },
        paymentStatus: PaymentStatus.PAID,
        paidAt: {
          gte: period.from,
          lte: period.to
        }
      },
      select: {
        totalCostCents: true,
        grossProfitCents: true
      }
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        isVoided: false,
        paidAt: {
          gte: period.from,
          lte: period.to
        },
        repairOrder: {
          deletedAt: null,
          repairStatus: {
            not: RepairStatus.CANCELLED
          }
        }
      },
      select: {
        amountCents: true,
        repairOrderId: true
      }
    }),
    prisma.expense.aggregate({
      where: {
        organizationId,
        status: ExpenseStatus.CONFIRMED,
        spentAt: {
          gte: period.from,
          lte: period.to
        }
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.repairOrderItem.findMany({
      where: {
        organizationId,
        commissionCalculatedAt: {
          gte: period.from,
          lte: period.to
        },
        commissionAmountCents: {
          gt: 0
        },
        repairOrder: {
          deletedAt: null
        }
      },
      select: masterCommissionSelect
    }),
    prisma.repairOrderItem.findMany({
      where: {
        organizationId,
        commissionPayoutStatus: CommissionPayoutStatus.PAID,
        commissionPaidAt: {
          gte: period.from,
          lte: period.to
        },
        commissionAmountCents: {
          gt: 0
        },
        repairOrder: {
          deletedAt: null
        }
      },
      select: masterCommissionSelect
    }),
    prisma.repairOrderItem.findMany({
      where: {
        organizationId,
        commissionPayoutStatus: CommissionPayoutStatus.UNPAID,
        commissionAmountCents: {
          gt: 0
        },
        repairOrder: {
          deletedAt: null
        }
      },
      select: masterCommissionSelect
    }),
    prisma.financeOperation.groupBy({
      by: ["type"],
      where: {
        organizationId,
        occurredAt: {
          gte: period.from,
          lte: period.to
        }
      },
      _sum: {
        amountCents: true
      }
    }),
    prisma.repairOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        repairStatus: {
          not: RepairStatus.CANCELLED
        },
        createdAt: {
          gte: period.from,
          lte: period.to
        }
      }
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        isVoided: false,
        paidAt: {
          gte: period.from,
          lte: period.to
        }
      },
      include: {
        acceptedBy: {
          select: {
            name: true
          }
        },
        repairOrder: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        paidAt: "desc"
      },
      take: period.limit
    }),
    prisma.expense.findMany({
      where: {
        organizationId,
        status: ExpenseStatus.CONFIRMED,
        spentAt: {
          gte: period.from,
          lte: period.to
        }
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        },
        repairOrder: {
          select: {
            id: true,
            orderNumber: true
          }
        }
      },
      orderBy: {
        spentAt: "desc"
      },
      take: period.limit
    }),
    prisma.financeOperation.findMany({
      where: {
        organizationId,
        occurredAt: {
          gte: period.from,
          lte: period.to
        }
      },
      include: {
        createdBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        occurredAt: "desc"
      },
      take: period.limit
    })
  ]);

  const allManual = sumManualGroups(allManualGroups);
  const periodManual = sumManualGroups(periodManualGroups);
  const accountBalanceCents =
    (allPayments._sum.amountCents ?? 0) -
    (allConfirmedExpenses._sum.amountCents ?? 0) +
    allManual.inflowCents -
    allManual.outflowCents;
  const paidRevenueCents = acceptedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const paidCostCents = paidOrders.reduce((sum, order) => sum + order.totalCostCents, 0);
  const grossProfitCents = paidOrders.reduce((sum, order) => sum + order.grossProfitCents, 0);
  const paidCommissionsCents = paidCommissionItems.reduce(
    (sum, item) => sum + (item.commissionAmountCents ?? 0),
    0
  );
  const payableCommissionsCents = payableCommissionItems.reduce(
    (sum, item) => sum + (item.commissionAmountCents ?? 0),
    0
  );
  const masterCommissions = buildMasterCommissionBreakdown({
    accruedCommissionItems,
    paidCommissionItems,
    payableCommissionItems
  });

  return {
    period: {
      from: period.from,
      to: period.to
    },
    accountBalanceCents,
    paidRevenueCents,
    paidCostCents,
    grossProfitCents,
    confirmedExpensesCents: confirmedExpenses._sum.amountCents ?? 0,
    paidCommissionsCents,
    payableCommissionsCents,
    manualInflowCents: periodManual.inflowCents,
    manualOutflowCents: periodManual.outflowCents,
    repairOrdersCount,
    paidOrdersCount: paidOrders.length,
    averagePaidTicketCents: paidOrders.length > 0 ? Math.round(paidRevenueCents / paidOrders.length) : 0,
    masterCommissions,
    operations: [
      ...paymentOperations.map((payment) => ({
        id: payment.id,
        source: "PAYMENT" as const,
        type: "PAYMENT_RECEIVED" as const,
        direction: "IN" as const,
        amountCents: payment.amountCents,
        occurredAt: payment.paidAt,
        description: `Оплата заказа № ${payment.repairOrder.orderNumber}`,
        counterpartyName: payment.repairOrder.customer?.name ?? null,
        repairOrderId: payment.repairOrder.id,
        repairOrderNumber: payment.repairOrder.orderNumber,
        createdByName: payment.acceptedBy?.name ?? null,
        comment: payment.comment
      })),
      ...expenseOperations.map((expense) => ({
        id: expense.id,
        source: "EXPENSE" as const,
        type:
          expense.kind === ExpenseKind.SALARY
            ? ("SALARY_PAYOUT" as const)
            : expense.kind === ExpenseKind.TAX
              ? ("TAX_EXPENSE" as const)
              : ("EXPENSE_CONFIRMED" as const),
        direction: "OUT" as const,
        amountCents: expense.amountCents,
        occurredAt: expense.spentAt,
        description: expense.description,
        counterpartyName: expense.spentByName,
        repairOrderId: expense.repairOrder?.id ?? null,
        repairOrderNumber: expense.repairOrder?.orderNumber ?? null,
        createdByName: expense.createdBy?.name ?? null,
        comment: expense.comment
      })),
      ...manualOperations.map((operation) => ({
        id: operation.id,
        source: "MANUAL" as const,
        type: operation.type,
        direction: operation.type === DbFinanceOperationType.DEPOSIT ? ("IN" as const) : ("OUT" as const),
        amountCents: operation.amountCents,
        occurredAt: operation.occurredAt,
        description: operation.description,
        counterpartyName: null,
        repairOrderId: null,
        repairOrderNumber: null,
        createdByName: operation.createdBy?.name ?? null,
        comment: operation.comment
      }))
    ]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, period.limit)
  };
}

export async function createManualFinanceOperation(
  organizationId: string,
  createdByUserId: string,
  input: CreateFinanceOperationInput
) {
  return prisma.financeOperation.create({
    data: {
      organizationId,
      createdByUserId,
      type: input.type,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      description: input.description.trim(),
      comment: input.comment?.trim() || null
    },
    include: {
      createdBy: {
        select: {
          name: true
        }
      }
    }
  });
}
