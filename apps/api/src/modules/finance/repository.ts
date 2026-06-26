import {
  CommissionPayoutStatus,
  ExpenseKind,
  ExpenseStatus,
  FinanceOperationType as DbFinanceOperationType,
  PaymentStatus,
  prisma,
  RepairStatus
} from "@orchid/db";

import { isSupportedPaymentMethodName, type CreateFinanceOperationInput } from "@orchid/shared";

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

type ServiceMixBucket = {
  count: number;
  revenueCents: number;
  grossProfitCents: number;
};

type MasterWorkBucket = {
  masterMembershipId: string | null;
  masterName: string;
  servicesCount: number;
  standardServicesCount: number;
  customServicesCount: number;
  revenueCents: number;
  grossProfitCents: number;
  commissionCents: number;
};

type PaymentMethodBucket = {
  key: string;
  label: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  count: number;
};

function formatInstrumentName(instrument: { type: string; brand: string | null; model: string | null } | null) {
  if (!instrument) {
    return null;
  }

  return [instrument.brand, instrument.model].filter(Boolean).join(" ") || instrument.type;
}

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

function emptyServiceBucket(): ServiceMixBucket {
  return {
    count: 0,
    revenueCents: 0,
    grossProfitCents: 0
  };
}

function buildOperationalAnalytics({
  expenseDetails,
  paymentDetails,
  manualOperationDetails,
  serviceItems
}: {
  expenseDetails: Array<{
    amountCents: number;
    category: { name: string | null } | null;
    createdBy: { id: string; name: string | null; email: string } | null;
    paymentMethod: { id: string; name: string } | null;
  }>;
  paymentDetails: Array<{
    amountCents: number;
    paymentMethod: { id: string; name: string } | null;
  }>;
  manualOperationDetails: Array<{
    amountCents: number;
    type: DbFinanceOperationType;
    paymentMethod: { id: string; name: string } | null;
  }>;
  serviceItems: Array<{
    serviceCatalogItemId: string | null;
    assignedMasterMembershipId: string | null;
    priceCents: number;
    costCents: number;
    commissionAmountCents: number | null;
    assignedMaster: { user: { name: string | null; email: string } } | null;
    expenses: Array<{ amountCents: number }>;
  }>;
}) {
  const serviceMix = {
    standard: emptyServiceBucket(),
    custom: emptyServiceBucket()
  };
  const masterWorks = new Map<string, MasterWorkBucket>();
  const paymentMethods = new Map<string, PaymentMethodBucket>();
  const expensesByCategory = new Map<string, { key: string; label: string; amountCents: number; count: number }>();
  const expensesByCreator = new Map<string, { key: string; label: string; amountCents: number; count: number }>();

  function paymentMethodBucket(method: { id: string; name: string } | null) {
    if (!method || !isSupportedPaymentMethodName(method.name)) {
      return null;
    }

    const key = method.id;
    const existing = paymentMethods.get(key);

    if (existing) {
      return existing;
    }

    const bucket = {
      key,
      label: method.name.trim(),
      inflowCents: 0,
      outflowCents: 0,
      netCents: 0,
      count: 0
    };

    paymentMethods.set(key, bucket);

    return bucket;
  }

  for (const item of serviceItems) {
    const confirmedExpenseCents = item.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
    const grossProfitCents = item.priceCents - item.costCents - confirmedExpenseCents;
    const serviceBucket = item.serviceCatalogItemId ? serviceMix.standard : serviceMix.custom;

    serviceBucket.count += 1;
    serviceBucket.revenueCents += item.priceCents;
    serviceBucket.grossProfitCents += grossProfitCents;

    const masterKey = item.assignedMasterMembershipId ?? "unassigned";
    const existingMaster = masterWorks.get(masterKey) ?? {
      masterMembershipId: item.assignedMasterMembershipId,
      masterName: item.assignedMaster?.user.name ?? item.assignedMaster?.user.email ?? "Без мастера",
      servicesCount: 0,
      standardServicesCount: 0,
      customServicesCount: 0,
      revenueCents: 0,
      grossProfitCents: 0,
      commissionCents: 0
    };

    existingMaster.servicesCount += 1;
    existingMaster.standardServicesCount += item.serviceCatalogItemId ? 1 : 0;
    existingMaster.customServicesCount += item.serviceCatalogItemId ? 0 : 1;
    existingMaster.revenueCents += item.priceCents;
    existingMaster.grossProfitCents += grossProfitCents;
    existingMaster.commissionCents += item.commissionAmountCents ?? 0;
    masterWorks.set(masterKey, existingMaster);
  }

  for (const payment of paymentDetails) {
    const method = paymentMethodBucket(payment.paymentMethod);

    if (method) {
      method.inflowCents += payment.amountCents;
      method.netCents += payment.amountCents;
      method.count += 1;
    }
  }

  for (const expense of expenseDetails) {
    const method = paymentMethodBucket(expense.paymentMethod);

    if (method) {
      method.outflowCents += expense.amountCents;
      method.netCents -= expense.amountCents;
      method.count += 1;
    }

    const categoryLabel = expense.category?.name ?? "Без категории";
    const categoryKey = categoryLabel.toLowerCase();
    const category = expensesByCategory.get(categoryKey) ?? {
      key: categoryKey,
      label: categoryLabel,
      amountCents: 0,
      count: 0
    };

    category.amountCents += expense.amountCents;
    category.count += 1;
    expensesByCategory.set(categoryKey, category);

    const creatorKey = expense.createdBy?.id ?? "unknown";
    const creatorLabel = expense.createdBy?.name ?? expense.createdBy?.email ?? "Без автора";
    const creator = expensesByCreator.get(creatorKey) ?? {
      key: creatorKey,
      label: creatorLabel,
      amountCents: 0,
      count: 0
    };

    creator.amountCents += expense.amountCents;
    creator.count += 1;
    expensesByCreator.set(creatorKey, creator);
  }

  for (const operation of manualOperationDetails) {
    const method = paymentMethodBucket(operation.paymentMethod);

    if (method) {
      if (operation.type === DbFinanceOperationType.DEPOSIT) {
        method.inflowCents += operation.amountCents;
        method.netCents += operation.amountCents;
      } else {
        method.outflowCents += operation.amountCents;
        method.netCents -= operation.amountCents;
      }

      method.count += 1;
    }
  }

  return {
    serviceMix,
    masterWorks: [...masterWorks.values()].sort(
      (left, right) => right.servicesCount - left.servicesCount || right.revenueCents - left.revenueCents
    ),
    paymentMethods: [...paymentMethods.values()].sort(
      (left, right) =>
        right.inflowCents + right.outflowCents - (left.inflowCents + left.outflowCents) ||
        left.label.localeCompare(right.label, "ru")
    ),
    expensesByCategory: [...expensesByCategory.values()].sort((left, right) => right.amountCents - left.amountCents),
    expensesByCreator: [...expensesByCreator.values()].sort((left, right) => right.amountCents - left.amountCents)
  };
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
  const receivableOrderWhere = {
    organizationId,
    deletedAt: null,
    repairStatus: {
      not: RepairStatus.CANCELLED
    },
    paymentStatus: {
      in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID]
    }
  };

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
    receivableOrderDetails,
    serviceItems,
    confirmedExpenseDetails,
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
        repairOrderId: true,
        paymentMethod: {
          select: {
            id: true,
            name: true
          }
        }
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
    prisma.repairOrder.findMany({
      where: receivableOrderWhere,
      select: {
        id: true,
        orderNumber: true,
        repairStatus: true,
        paymentStatus: true,
        totalAmountCents: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            name: true
          }
        },
        instrument: {
          select: {
            type: true,
            brand: true,
            model: true
          }
        },
        payments: {
          where: {
            isVoided: false
          },
          select: {
            amountCents: true
          }
        }
      }
    }),
    prisma.repairOrderItem.findMany({
      where: {
        organizationId,
        type: "SERVICE",
        repairOrder: {
          deletedAt: null,
          repairStatus: {
            not: RepairStatus.CANCELLED
          },
          issuedAt: {
            gte: period.from,
            lte: period.to
          }
        }
      },
      select: {
        serviceCatalogItemId: true,
        assignedMasterMembershipId: true,
        priceCents: true,
        costCents: true,
        commissionAmountCents: true,
        assignedMaster: {
          select: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
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
      select: {
        amountCents: true,
        category: {
          select: {
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        paymentMethod: {
          select: {
            id: true,
            name: true
          }
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
        paymentMethod: {
          select: {
            id: true,
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
        paymentMethod: {
          select: {
            id: true,
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
        },
        paymentMethod: {
          select: {
            id: true,
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
  const analytics = buildOperationalAnalytics({
    expenseDetails: confirmedExpenseDetails,
    manualOperationDetails: manualOperations,
    paymentDetails: acceptedPayments,
    serviceItems
  });
  const receivableOrders = receivableOrderDetails
    .map((order) => {
      const paidCents = order.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? null,
        instrumentName: formatInstrumentName(order.instrument),
        repairStatus: order.repairStatus,
        paymentStatus: order.paymentStatus,
        totalAmountCents: order.totalAmountCents,
        paidAmountCents: paidCents,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        balanceDueCents: Math.max(order.totalAmountCents - paidCents, 0)
      };
    })
    .filter((order) => order.balanceDueCents > 0)
    .sort(
      (left, right) =>
        right.balanceDueCents - left.balanceDueCents ||
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.orderNumber.localeCompare(right.orderNumber, "ru")
    );
  const partiallyPaidOrdersCount = receivableOrders.filter(
    (order) => order.paymentStatus === PaymentStatus.PARTIALLY_PAID
  ).length;
  const receivablesCents = receivableOrders.reduce((sum, order) => sum + order.balanceDueCents, 0);

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
    unpaidOrdersCount: receivableOrders.length,
    partiallyPaidOrdersCount,
    receivablesCents,
    averagePaidTicketCents: paidOrders.length > 0 ? Math.round(paidRevenueCents / paidOrders.length) : 0,
    analytics,
    masterCommissions,
    receivableOrders,
    operations: [
      ...paymentOperations.map((payment) => ({
        id: payment.id,
        source: "PAYMENT" as const,
        type: "PAYMENT_RECEIVED" as const,
        direction: "IN" as const,
        amountCents: payment.amountCents,
        occurredAt: payment.paidAt,
        description: `Оплата заказа № ${payment.repairOrder.orderNumber}`,
        paymentMethodId: payment.paymentMethod?.id ?? null,
        paymentMethodName: payment.paymentMethod?.name ?? null,
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
        paymentMethodId: expense.paymentMethod?.id ?? null,
        paymentMethodName: expense.paymentMethod?.name ?? null,
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
        paymentMethodId: operation.paymentMethod?.id ?? null,
        paymentMethodName: operation.paymentMethod?.name ?? null,
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
      paymentMethodId: input.paymentMethodId,
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
      },
      paymentMethod: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}
