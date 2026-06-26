import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  expenseAggregate: vi.fn(),
  expenseFindMany: vi.fn(),
  financeOperationFindMany: vi.fn(),
  financeOperationGroupBy: vi.fn(),
  paymentAggregate: vi.fn(),
  paymentFindMany: vi.fn(),
  repairOrderCount: vi.fn(),
  repairOrderFindMany: vi.fn(),
  repairOrderItemFindMany: vi.fn()
}));

vi.mock("@orchid/db", () => ({
  CommissionPayoutStatus: {
    PAID: "PAID",
    UNPAID: "UNPAID"
  },
  ExpenseKind: {
    REGULAR: "REGULAR",
    SALARY: "SALARY",
    TAX: "TAX"
  },
  ExpenseStatus: {
    CONFIRMED: "CONFIRMED"
  },
  FinanceOperationType: {
    DEPOSIT: "DEPOSIT",
    WITHDRAWAL: "WITHDRAWAL"
  },
  PaymentStatus: {
    PAID: "PAID",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    UNPAID: "UNPAID"
  },
  RepairStatus: {
    CANCELLED: "CANCELLED"
  },
  prisma: {
    expense: {
      aggregate: db.expenseAggregate,
      findMany: db.expenseFindMany
    },
    financeOperation: {
      findMany: db.financeOperationFindMany,
      groupBy: db.financeOperationGroupBy
    },
    payment: {
      aggregate: db.paymentAggregate,
      findMany: db.paymentFindMany
    },
    repairOrder: {
      count: db.repairOrderCount,
      findMany: db.repairOrderFindMany
    },
    repairOrderItem: {
      findMany: db.repairOrderItemFindMany
    }
  }
}));

const { getFinanceData } = await import("./repository.js");

const cashMethod = {
  id: "method-cash",
  name: "Наличные"
};

function regularExpense() {
  return {
    id: "expense-regular",
    amountCents: 5_000,
    category: {
      name: "Материалы"
    },
    comment: null,
    createdBy: {
      id: "user-owner",
      email: "owner@orchid.local",
      name: "Саша"
    },
    description: "Струны",
    kind: "REGULAR",
    paymentMethod: cashMethod,
    repairOrder: null,
    spentAt: new Date("2026-06-11T10:00:00.000Z"),
    spentByName: null
  };
}

function salaryExpense() {
  return {
    id: "expense-salary",
    amountCents: 168_000,
    category: null,
    comment: "Комиссия за услугу: Setup",
    createdBy: {
      id: "user-owner",
      email: "owner@orchid.local",
      name: "Саша"
    },
    description: "Выплата мастеру по заказу № 00001",
    kind: "SALARY",
    paymentMethod: cashMethod,
    repairOrder: {
      id: "repair-1",
      orderNumber: "00001"
    },
    spentAt: new Date("2026-06-12T10:00:00.000Z"),
    spentByName: "Дима"
  };
}

describe("finance repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    db.paymentAggregate.mockResolvedValue({
      _sum: {
        amountCents: 0
      }
    });
    db.expenseAggregate
      .mockResolvedValueOnce({
        _sum: {
          amountCents: 173_000
        }
      })
      .mockResolvedValueOnce({
        _sum: {
          amountCents: 5_000
        }
      });
    db.financeOperationGroupBy.mockResolvedValue([]);
    db.repairOrderFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    db.paymentFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    db.repairOrderItemFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          assignedMasterMembershipId: "master-1",
          commissionAmountCents: 168_000,
          assignedMaster: {
            user: {
              name: "Дима"
            }
          }
        }
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    db.repairOrderCount.mockResolvedValue(0);
    db.expenseFindMany
      .mockResolvedValueOnce([regularExpense(), salaryExpense()])
      .mockResolvedValueOnce([regularExpense(), salaryExpense()]);
    db.financeOperationFindMany.mockResolvedValue([]);
  });

  it("keeps master payouts out of expense article analytics", async () => {
    const data = await getFinanceData("org-1", {
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-30T23:59:59.999Z"),
      limit: 80
    });

    expect(db.expenseAggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          kind: {
            not: "SALARY"
          }
        })
      })
    );
    expect(data.confirmedExpensesCents).toBe(5_000);
    expect(data.paidCommissionsCents).toBe(168_000);
    expect(data.analytics.expensesByCategory).toEqual([
      {
        key: "материалы",
        label: "Материалы",
        amountCents: 5_000,
        count: 1
      }
    ]);
    expect(data.analytics.expensesByCreator).toEqual([
      {
        key: "user-owner",
        label: "Саша",
        amountCents: 5_000,
        count: 1
      }
    ]);
    expect(data.analytics.paymentMethods).toEqual([
      {
        key: "method-cash",
        label: "Наличные",
        inflowCents: 0,
        outflowCents: 173_000,
        netCents: -173_000,
        count: 2
      }
    ]);
    expect(data.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "expense-salary",
          type: "SALARY_PAYOUT",
          description: "Выплата мастеру по заказу № 00001"
        })
      ])
    );
  });
});
