import { CommissionPayoutStatus, ExpenseStatus, PaymentStatus, prisma, RepairStatus } from "@orchid/db";

export async function getDashboardData(organizationId: string, period: { from: Date; to: Date }) {
  const [
    orders,
    paidOrders,
    acceptedPayments,
    confirmedExpenses,
    accruedCommissionItems,
    paidCommissionItems,
    statusGroups
  ] = await Promise.all([
    prisma.repairOrder.findMany({
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
      },
      select: {
        totalAmountCents: true,
        totalCostCents: true,
        grossProfitCents: true,
        actualCommissionCents: true,
        lineItems: {
          select: {
            commissionAmountCents: true,
            commissionPayoutStatus: true
          }
        },
        paymentStatus: true
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
        totalAmountCents: true,
        totalCostCents: true,
        grossProfitCents: true,
        actualCommissionCents: true,
        lineItems: {
          select: {
            type: true,
            priceCents: true,
            costCents: true,
            commissionAmountCents: true,
            commissionPayoutStatus: true
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
      select: {
        commissionAmountCents: true,
        commissionPayoutStatus: true
      }
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
      select: {
        commissionAmountCents: true
      }
    }),
    prisma.repairOrder.groupBy({
      by: ["repairStatus"],
      where: {
        organizationId,
        deletedAt: null,
        createdAt: {
          gte: period.from,
          lte: period.to
        }
      },
      _count: {
        _all: true
      }
    })
  ]);

  return {
    orders,
    paidOrders,
    acceptedPayments,
    confirmedExpensesCents: confirmedExpenses._sum.amountCents ?? 0,
    accruedCommissionItems,
    paidCommissionItems,
    statusGroups
  };
}
