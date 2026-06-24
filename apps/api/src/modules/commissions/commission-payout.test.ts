import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  expenseCreate: vi.fn(),
  repairOrderItemUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@orchid/db", () => ({
  CommissionPayoutStatus: {
    PAID: "PAID",
    UNPAID: "UNPAID"
  },
  ExpenseKind: {
    SALARY: "SALARY"
  },
  ExpenseStatus: {
    CONFIRMED: "CONFIRMED"
  },
  prisma: {
    $transaction: mocks.transaction
  }
}));

const { markMasterCommissionPaid, markMasterCommissionsPaid } = await import("./repository.js");

describe("commission payout repository", () => {
  beforeEach(() => {
    mocks.repairOrderItemUpdate.mockReset();
    mocks.expenseCreate.mockReset();
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({
        repairOrderItem: {
          update: mocks.repairOrderItemUpdate
        },
        expense: {
          create: mocks.expenseCreate
        }
      })
    );
  });

  it("marks commission paid and creates a confirmed salary expense in one transaction", async () => {
    mocks.repairOrderItemUpdate.mockResolvedValue({
      id: "item-1",
      repairOrderId: "order-1",
      nameSnapshot: "Setup",
      commissionAmountCents: 18_540,
      assignedMaster: {
        user: {
          name: "Master 1"
        }
      },
      commissionPaidBy: {
        name: "Owner"
      },
      repairOrder: {
        orderNumber: "90001",
        customer: {
          name: "Customer"
        }
      }
    });
    mocks.expenseCreate.mockResolvedValue({});

    await expect(markMasterCommissionPaid("org-1", "item-1", "owner-1")).resolves.toMatchObject({
      id: "item-1",
      commissionAmountCents: 18_540
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.repairOrderItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-1",
          organizationId: "org-1",
          commissionPayoutStatus: "UNPAID"
        }),
        data: expect.objectContaining({
          commissionPayoutStatus: "PAID",
          commissionPaidByUserId: "owner-1"
        })
      })
    );
    expect(mocks.expenseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        createdByUserId: "owner-1",
        repairOrderId: "order-1",
        repairOrderItemId: "item-1",
        amountCents: 18_540,
        spentByName: "Master 1",
        kind: "SALARY",
        status: "CONFIRMED"
      })
    });
  });

  it("marks multiple commissions paid in one transaction", async () => {
    mocks.repairOrderItemUpdate
      .mockResolvedValueOnce({
        id: "item-1",
        repairOrderId: "order-1",
        nameSnapshot: "Setup",
        commissionAmountCents: 18_540,
        assignedMaster: {
          user: {
            name: "Master 1"
          }
        },
        commissionPaidBy: {
          name: "Owner"
        },
        repairOrder: {
          orderNumber: "90001",
          customer: {
            name: "Customer"
          }
        }
      })
      .mockResolvedValueOnce({
        id: "item-2",
        repairOrderId: "order-2",
        nameSnapshot: "Fret polish",
        commissionAmountCents: 12_000,
        assignedMaster: {
          user: {
            name: "Master 1"
          }
        },
        commissionPaidBy: {
          name: "Owner"
        },
        repairOrder: {
          orderNumber: "90002",
          customer: {
            name: "Customer"
          }
        }
      });
    mocks.expenseCreate.mockResolvedValue({});

    await expect(markMasterCommissionsPaid("org-1", ["item-1", "item-2"], "owner-1")).resolves.toHaveLength(2);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.repairOrderItemUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.expenseCreate).toHaveBeenCalledTimes(2);
    expect(mocks.expenseCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        organizationId: "org-1",
        createdByUserId: "owner-1",
        repairOrderId: "order-2",
        repairOrderItemId: "item-2",
        amountCents: 12_000,
        description: "Выплата мастеру по заказу № 90002",
        kind: "SALARY",
        status: "CONFIRMED",
        comment: "Комиссия за услугу: Fret polish"
      })
    });
  });
});
