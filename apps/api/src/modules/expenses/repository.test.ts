import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  expenseFindFirst: vi.fn(),
  expenseUpdate: vi.fn(),
  recalculateIssuedOrderCommissionsTx: vi.fn(),
  repairOrderFindFirst: vi.fn(),
  repairOrderItemUpdate: vi.fn(),
  repairOrderUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@orchid/db", () => ({
  ExpenseKind: {
    REGULAR: "REGULAR",
    SALARY: "SALARY",
    TAX: "TAX"
  },
  ExpenseStatus: {
    CONFIRMED: "CONFIRMED",
    DRAFT: "DRAFT",
    VOIDED: "VOIDED"
  },
  PaymentStatus: {
    PAID: "PAID",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    UNPAID: "UNPAID"
  },
  prisma: {
    $transaction: mocks.transaction
  }
}));

vi.mock("../repair-orders/repository.js", () => ({
  recalculateIssuedOrderCommissionsTx: mocks.recalculateIssuedOrderCommissionsTx
}));

const { confirmExpense } = await import("./repository.js");

function expenseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "expense-1",
    organizationId: "org-1",
    amountCents: 5_000,
    kind: "REGULAR",
    status: "DRAFT",
    repairOrderId: "order-1",
    repairOrderItemId: "item-1",
    ...overrides
  };
}

describe("expense repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({
        expense: {
          findFirst: mocks.expenseFindFirst,
          update: mocks.expenseUpdate
        },
        repairOrder: {
          findFirst: mocks.repairOrderFindFirst,
          update: mocks.repairOrderUpdate
        },
        repairOrderItem: {
          update: mocks.repairOrderItemUpdate
        }
      })
    );
  });

  it("charges confirmed service consumables to the client order total", async () => {
    mocks.expenseFindFirst.mockResolvedValue(expenseRecord());
    mocks.expenseUpdate.mockResolvedValue(expenseRecord({ status: "CONFIRMED" }));
    mocks.repairOrderFindFirst.mockResolvedValue({
      id: "order-1",
      totalAmountCents: 120_000,
      taxRateBps: null,
      taxAmountCents: null,
      payments: [
        {
          amountCents: 40_000
        }
      ]
    });

    await expect(confirmExpense("org-1", "expense-1")).resolves.toMatchObject({
      id: "expense-1",
      status: "CONFIRMED"
    });

    expect(mocks.repairOrderItemUpdate).toHaveBeenCalledWith({
      where: {
        id: "item-1"
      },
      data: {
        priceCents: {
          increment: 5_000
        }
      }
    });
    expect(mocks.repairOrderUpdate).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        organizationId: "org-1"
      },
      data: {
        totalAmountCents: {
          increment: 5_000
        },
        grossProfitCents: {
          increment: 5_000
        },
        paymentStatus: "PARTIALLY_PAID",
        taxAmountCents: null
      }
    });
    expect(mocks.recalculateIssuedOrderCommissionsTx).toHaveBeenCalledWith(
      expect.any(Object),
      "org-1",
      "order-1"
    );
  });

  it("does not charge the order twice when an expense is already confirmed", async () => {
    mocks.expenseFindFirst.mockResolvedValue(expenseRecord({ status: "CONFIRMED" }));

    await expect(confirmExpense("org-1", "expense-1")).resolves.toMatchObject({
      id: "expense-1",
      status: "CONFIRMED"
    });

    expect(mocks.expenseUpdate).not.toHaveBeenCalled();
    expect(mocks.repairOrderItemUpdate).not.toHaveBeenCalled();
    expect(mocks.repairOrderUpdate).not.toHaveBeenCalled();
    expect(mocks.recalculateIssuedOrderCommissionsTx).not.toHaveBeenCalled();
  });
});
