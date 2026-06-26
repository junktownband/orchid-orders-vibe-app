import { ExpenseKind, ExpenseStatus, prisma } from "@orchid/db";

import { recalculateIssuedOrderCommissionsTx } from "../repair-orders/repository.js";

export type ExpenseListOptions = {
  from?: Date;
  to?: Date;
  createdByUserId?: string;
  status?: ExpenseStatus;
  limit: number;
};

export async function listExpenses(organizationId: string, options: ExpenseListOptions) {
  return prisma.expense.findMany({
    where: {
      organizationId,
      createdByUserId: options.createdByUserId || undefined,
      status: options.status,
      spentAt:
        options.from || options.to
          ? {
              gte: options.from,
              lte: options.to
            }
          : undefined
    },
    include: {
      category: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      paymentMethod: true,
      repairOrder: {
        select: {
          id: true,
          orderNumber: true
        }
      },
      repairOrderItem: {
        select: {
          id: true,
          nameSnapshot: true
        }
      }
    },
    orderBy: {
      spentAt: "desc"
    },
    take: options.limit
  });
}

export async function listExpenseAuthors(organizationId: string, range?: { from?: Date; to?: Date }) {
  const expenses = await prisma.expense.findMany({
    where: {
      organizationId,
      createdByUserId: {
        not: null
      },
      spentAt:
        range?.from || range?.to
          ? {
              gte: range.from,
              lte: range.to
            }
          : undefined
    },
    distinct: ["createdByUserId"],
    select: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdByUserId: "asc"
    }
  });

  return expenses
    .map((expense) => expense.createdBy)
    .filter((author): author is { id: string; name: string; email: string } => Boolean(author))
    .map((author) => ({
      id: author.id,
      name: author.name ?? author.email
    }));
}

export async function findExpenseRepairOrder(organizationId: string, id: string) {
  return prisma.repairOrder.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    select: {
      id: true
    }
  });
}

export async function findExpenseRepairOrderItem(organizationId: string, id: string) {
  return prisma.repairOrderItem.findFirst({
    where: {
      id,
      organizationId
    },
    select: {
      id: true,
      repairOrderId: true
    }
  });
}

export async function createExpense(
  organizationId: string,
  createdByUserId: string,
  data: {
    categoryId?: string | null;
    repairOrderId?: string | null;
    repairOrderItemId?: string | null;
    paymentMethodId?: string | null;
    amountCents: number;
    spentAt: Date;
    spentByName?: string | null;
    description: string;
    comment?: string | null;
  }
) {
  return prisma.expense.create({
    data: {
      organizationId,
      createdByUserId,
      categoryId: data.categoryId,
      repairOrderId: data.repairOrderId,
      repairOrderItemId: data.repairOrderItemId,
      paymentMethodId: data.paymentMethodId,
      amountCents: data.amountCents,
      spentAt: data.spentAt,
      spentByName: data.spentByName,
      description: data.description,
      comment: data.comment,
      status: ExpenseStatus.DRAFT
    },
    include: {
      category: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      paymentMethod: true,
      repairOrder: {
        select: {
          id: true,
          orderNumber: true
        }
      },
      repairOrderItem: {
        select: {
          id: true,
          nameSnapshot: true
        }
      }
    }
  });
}

export async function confirmExpense(organizationId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.update({
      where: {
        id,
        organizationId
      },
      data: {
        status: ExpenseStatus.CONFIRMED,
        confirmedAt: new Date()
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        paymentMethod: true,
        repairOrder: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        repairOrderItem: {
          select: {
            id: true,
            nameSnapshot: true
          }
        }
      }
    });

    if (expense.kind === ExpenseKind.REGULAR && expense.repairOrderId && expense.repairOrderItemId) {
      await recalculateIssuedOrderCommissionsTx(tx, organizationId, expense.repairOrderId);
    }

    return expense;
  });
}

export async function voidExpense(organizationId: string, id: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.expense.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        paymentMethod: true,
        repairOrder: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        repairOrderItem: {
          select: {
            id: true,
            nameSnapshot: true
          }
        }
      }
    });

    if (!existing) {
      throw new Error("Expense not found");
    }

    if (existing.kind !== ExpenseKind.REGULAR) {
      throw new Error("System expense cannot be voided here");
    }

    if (existing.status === ExpenseStatus.VOIDED) {
      throw new Error("Expense already voided");
    }

    const expense = await tx.expense.update({
      where: {
        id,
        organizationId
      },
      data: {
        status: ExpenseStatus.VOIDED,
        voidedAt: new Date(),
        voidReason: reason
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        paymentMethod: true,
        repairOrder: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        repairOrderItem: {
          select: {
            id: true,
            nameSnapshot: true
          }
        }
      }
    });

    if (
      existing.status === ExpenseStatus.CONFIRMED &&
      existing.repairOrderId &&
      existing.repairOrderItemId
    ) {
      await recalculateIssuedOrderCommissionsTx(tx, organizationId, existing.repairOrderId);
    }

    return expense;
  });
}
