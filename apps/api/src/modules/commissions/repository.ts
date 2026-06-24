import { CommissionPayoutStatus, ExpenseKind, ExpenseStatus, Prisma, prisma } from "@orchid/db";

import type { MasterCommissionQuery } from "@orchid/shared";

const masterCommissionInclude = {
  assignedMaster: {
    include: {
      user: true
    }
  },
  commissionPaidBy: {
    select: {
      name: true
    }
  },
  repairOrder: {
    include: {
      customer: true
    }
  }
} satisfies Prisma.RepairOrderItemInclude;

type PaidCommissionRecord = Prisma.RepairOrderItemGetPayload<{
  include: typeof masterCommissionInclude;
}>;

function commissionPeriodFilter(filters: MasterCommissionQuery): Prisma.DateTimeNullableFilter {
  const period: Prisma.DateTimeNullableFilter = {
    not: null
  };

  if (filters.from) {
    period.gte = new Date(`${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    period.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }

  return period;
}

function masterCommissionWhere(organizationId: string, filters: MasterCommissionQuery = {}): Prisma.RepairOrderItemWhereInput {
  return {
    organizationId,
    commissionAmountCents: {
      gt: 0
    },
    commissionCalculatedAt: commissionPeriodFilter(filters),
    ...(filters.masterMembershipId ? { assignedMasterMembershipId: filters.masterMembershipId } : {}),
    ...(filters.payoutStatus ? { commissionPayoutStatus: filters.payoutStatus } : {}),
    repairOrder: {
      deletedAt: null
    }
  };
}

export async function listMasterCommissions(organizationId: string, filters: MasterCommissionQuery = {}) {
  return prisma.repairOrderItem.findMany({
    where: masterCommissionWhere(organizationId, filters),
    include: masterCommissionInclude,
    orderBy: [
      {
        commissionCalculatedAt: "desc"
      },
      {
        id: "desc"
      }
    ]
  });
}

export async function summarizeMasterCommissions(organizationId: string, filters: MasterCommissionQuery = {}) {
  const groups = await prisma.repairOrderItem.groupBy({
    by: ["commissionPayoutStatus"],
    where: masterCommissionWhere(organizationId, filters),
    _sum: {
      commissionAmountCents: true
    }
  });

  return groups.reduce(
    (sum, group) => {
      const amountCents = group._sum.commissionAmountCents ?? 0;

      return {
        accruedCents: sum.accruedCents + amountCents,
        paidCents: sum.paidCents + (group.commissionPayoutStatus === CommissionPayoutStatus.PAID ? amountCents : 0),
        unpaidCents:
          sum.unpaidCents + (group.commissionPayoutStatus === CommissionPayoutStatus.UNPAID ? amountCents : 0)
      };
    },
    {
      accruedCents: 0,
      paidCents: 0,
      unpaidCents: 0
    }
  );
}

export async function markMasterCommissionPaid(
  organizationId: string,
  repairOrderItemId: string,
  paidByUserId: string
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const item = await tx.repairOrderItem.update({
      where: {
        id: repairOrderItemId,
        organizationId,
        commissionAmountCents: {
          gt: 0
        },
        commissionPayoutStatus: CommissionPayoutStatus.UNPAID
      },
      data: {
        commissionPayoutStatus: CommissionPayoutStatus.PAID,
        commissionPaidAt: now,
        commissionPaidByUserId: paidByUserId
      },
      include: masterCommissionInclude
    });
    const displayOrderNumber = item.repairOrder.orderNumber.replace(/^R-/i, "");

    await tx.expense.create({
      data: {
        organizationId,
        createdByUserId: paidByUserId,
        repairOrderId: item.repairOrderId,
        repairOrderItemId: item.id,
        amountCents: item.commissionAmountCents ?? 0,
        spentAt: now,
        spentByName: item.assignedMaster?.user.name ?? null,
        description: `Выплата мастеру по заказу № ${displayOrderNumber}`,
        kind: ExpenseKind.SALARY,
        status: ExpenseStatus.CONFIRMED,
        confirmedAt: now,
        comment: `Комиссия за услугу: ${item.nameSnapshot}`
      }
    });

    return item;
  });
}

export async function markMasterCommissionsPaid(
  organizationId: string,
  repairOrderItemIds: string[],
  paidByUserId: string
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const items: PaidCommissionRecord[] = [];

    for (const repairOrderItemId of repairOrderItemIds) {
      const item = await tx.repairOrderItem.update({
        where: {
          id: repairOrderItemId,
          organizationId,
          commissionAmountCents: {
            gt: 0
          },
          commissionPayoutStatus: CommissionPayoutStatus.UNPAID
        },
        data: {
          commissionPayoutStatus: CommissionPayoutStatus.PAID,
          commissionPaidAt: now,
          commissionPaidByUserId: paidByUserId
        },
        include: masterCommissionInclude
      });
      const displayOrderNumber = item.repairOrder.orderNumber.replace(/^R-/i, "");

      await tx.expense.create({
        data: {
          organizationId,
          createdByUserId: paidByUserId,
          repairOrderId: item.repairOrderId,
          repairOrderItemId: item.id,
          amountCents: item.commissionAmountCents ?? 0,
          spentAt: now,
          spentByName: item.assignedMaster?.user.name ?? null,
          description: `Выплата мастеру по заказу № ${displayOrderNumber}`,
          kind: ExpenseKind.SALARY,
          status: ExpenseStatus.CONFIRMED,
          confirmedAt: now,
          comment: `Комиссия за услугу: ${item.nameSnapshot}`
        }
      });

      items.push(item);
    }

    return items;
  });
}
