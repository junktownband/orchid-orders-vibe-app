import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  createManualFinanceOperation: vi.fn(),
  getFinanceData: vi.fn()
}));

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

const settings = vi.hoisted(() => ({
  assertActivePaymentMethod: vi.fn().mockResolvedValue({
    id: "method-cash",
    name: "Наличные"
  })
}));

vi.mock("./repository.js", () => repository);
vi.mock("../audit/service.js", () => audit);
vi.mock("../settings/service.js", () => settings);

const { addFinanceOperation, getFinanceOverview } = await import("./service.js");

const ownerAuth: AuthContext = {
  userId: "owner-user",
  membershipId: "owner-membership",
  organizationId: "org-1",
  role: "OWNER",
  user: {
    id: "owner-user",
    email: "owner@orchid.local",
    name: "Owner",
    role: "OWNER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "UTC"
    }
  }
};

function financeData(overrides: Record<string, unknown> = {}) {
  return {
    period: {
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-30T23:59:59.999Z")
    },
    accountBalanceCents: 125_000,
    paidRevenueCents: 300_000,
    paidCostCents: 80_000,
    grossProfitCents: 220_000,
    confirmedExpensesCents: 50_000,
    paidCommissionsCents: 30_000,
    payableCommissionsCents: 40_000,
    manualInflowCents: 20_000,
    manualOutflowCents: 10_000,
    repairOrdersCount: 4,
    paidOrdersCount: 2,
    unpaidOrdersCount: 2,
    partiallyPaidOrdersCount: 1,
    receivablesCents: 180_000,
    averagePaidTicketCents: 150_000,
    analytics: {
      serviceMix: {
        standard: {
          count: 3,
          revenueCents: 210_000,
          grossProfitCents: 150_000
        },
        custom: {
          count: 1,
          revenueCents: 90_000,
          grossProfitCents: 70_000
        }
      },
      masterWorks: [
        {
          masterMembershipId: "master-1",
          masterName: "Master",
          servicesCount: 4,
          standardServicesCount: 3,
          customServicesCount: 1,
          revenueCents: 300_000,
          grossProfitCents: 220_000,
          commissionCents: 70_000
        }
      ],
      paymentMethods: [
        {
          key: "cash",
          label: "Наличные",
          inflowCents: 220_000,
          outflowCents: 40_000,
          netCents: 180_000,
          count: 3
        },
        {
          key: "transfer",
          label: "Перевод",
          inflowCents: 80_000,
          outflowCents: 10_000,
          netCents: 70_000,
          count: 1
        }
      ],
      expensesByCategory: [
        {
          key: "materials",
          label: "Материалы",
          amountCents: 50_000,
          count: 2
        }
      ],
      expensesByCreator: [
        {
          key: "owner-user",
          label: "Owner",
          amountCents: 50_000,
          count: 2
        }
      ]
    },
    masterCommissions: [
      {
        masterMembershipId: "master-1",
        masterName: "Master",
        accruedCents: 70_000,
        paidCents: 30_000,
        payableCents: 40_000,
        accruedItemsCount: 2,
        paidItemsCount: 1,
        payableItemsCount: 1
      }
    ],
    receivableOrders: [
      {
        id: "repair-2",
        orderNumber: "00002",
        customerName: "Анна",
        instrumentName: "Fender Telecaster",
        repairStatus: "IN_PROGRESS",
        paymentStatus: "PARTIALLY_PAID",
        totalAmountCents: 250_000,
        paidAmountCents: 70_000,
        balanceDueCents: 180_000,
        createdAt: new Date("2026-06-08T10:00:00.000Z"),
        updatedAt: new Date("2026-06-12T10:00:00.000Z")
      }
    ],
    operations: [
      {
        id: "payment-1",
        source: "PAYMENT",
        type: "PAYMENT_RECEIVED",
        direction: "IN",
        amountCents: 300_000,
        occurredAt: new Date("2026-06-10T10:00:00.000Z"),
        description: "Оплата заказа № 00001",
        paymentMethodId: "method-cash",
        paymentMethodName: "Наличные",
        counterpartyName: "Петр",
        repairOrderId: "repair-1",
        repairOrderNumber: "00001",
        createdByName: "Owner",
        comment: null
      },
      {
        id: "expense-1",
        source: "EXPENSE",
        type: "EXPENSE_CONFIRMED",
        direction: "OUT",
        amountCents: 30_000,
        occurredAt: new Date("2026-06-11T10:00:00.000Z"),
        description: "Выплата мастеру по заказу № 00001",
        paymentMethodId: "method-cash",
        paymentMethodName: "Наличные",
        counterpartyName: "Master",
        repairOrderId: "repair-1",
        repairOrderNumber: "00001",
        createdByName: "Owner",
        comment: "Комиссия"
      }
    ],
    ...overrides
  };
}

describe("finance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns account balance, period totals, and a signed operation log for owners", async () => {
    repository.getFinanceData.mockResolvedValue(financeData());

    await expect(
      getFinanceOverview(ownerAuth, {
        from: "2026-06-01",
        to: "2026-06-30"
      })
    ).resolves.toMatchObject({
      account: {
        balanceCents: 125_000,
        availableAfterObligationsCents: 85_000,
        cashGapRiskCents: 0
      },
      summary: {
        paidRevenueCents: 300_000,
        grossProfitCents: 220_000,
        confirmedExpensesCents: 50_000,
        paidCommissionsCents: 30_000,
        payableCommissionsCents: 40_000,
        manualInflowCents: 20_000,
        manualOutflowCents: 10_000,
        netMovementCents: 260_000,
        repairOrdersCount: 4,
        unpaidOrdersCount: 2,
        partiallyPaidOrdersCount: 1,
        receivablesCents: 180_000,
        averagePaidTicketCents: 150_000
      },
      operations: [
        {
          id: "payment-1",
          direction: "IN",
          signedAmountCents: 300_000
        },
        {
          id: "expense-1",
          direction: "OUT",
          signedAmountCents: -30_000
        }
      ],
      masterCommissions: [
        {
          masterMembershipId: "master-1",
          masterName: "Master",
          accruedCents: 70_000,
          paidCents: 30_000,
          payableCents: 40_000,
          accruedItemsCount: 2,
          paidItemsCount: 1,
          payableItemsCount: 1
      }
    ],
    receivableOrders: [
      {
        id: "repair-2",
        orderNumber: "00002",
        customerName: "Анна",
        balanceDueCents: 180_000,
        paymentStatus: "PARTIALLY_PAID"
      }
    ],
    analytics: {
        serviceMix: {
          standard: {
            count: 3,
            revenueCents: 210_000
          },
          custom: {
            count: 1,
            revenueCents: 90_000
          }
        },
        masterWorks: [
          {
            masterName: "Master",
            servicesCount: 4,
            commissionCents: 70_000
          }
        ],
        paymentMethods: [
          {
            label: "Наличные",
            inflowCents: 220_000,
            outflowCents: 40_000,
            netCents: 180_000,
            count: 3
          },
          {
            label: "Перевод",
            inflowCents: 80_000,
            outflowCents: 10_000,
            netCents: 70_000,
            count: 1
          }
        ],
        expensesByCategory: [
          {
            label: "Материалы",
            amountCents: 50_000
          }
        ],
        expensesByCreator: [
          {
            label: "Owner",
            amountCents: 50_000
          }
        ]
      }
    });

    expect(repository.getFinanceData).toHaveBeenCalledWith("org-1", {
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-30T23:59:59.999Z"),
      limit: 80
    });
  });

  it("lets admins add money to the account as a manual deposit", async () => {
    repository.createManualFinanceOperation.mockResolvedValue({
      id: "manual-1",
      type: "DEPOSIT",
      amountCents: 50_000,
      paymentMethodId: "method-cash",
      occurredAt: new Date("2026-06-12T10:00:00.000Z"),
      description: "Стартовый остаток",
      comment: null,
      createdAt: new Date("2026-06-12T10:00:00.000Z"),
      updatedAt: new Date("2026-06-12T10:00:00.000Z"),
      createdBy: {
        name: "Owner"
      },
      paymentMethod: {
        id: "method-cash",
        name: "Наличные"
      }
    });

    await expect(
      addFinanceOperation(
        {
          ...ownerAuth,
          role: "ADMIN",
          user: {
            ...ownerAuth.user,
            role: "ADMIN"
          }
        },
        {
          type: "DEPOSIT",
          amountCents: 50_000,
          paymentMethodId: "method-cash",
          occurredAt: "2026-06-12T10:00:00.000Z",
          description: "Стартовый остаток"
        }
      )
    ).resolves.toMatchObject({
      source: "MANUAL",
      type: "DEPOSIT",
      direction: "IN",
      signedAmountCents: 50_000
    });

    expect(settings.assertActivePaymentMethod).toHaveBeenCalledWith("org-1", "method-cash");
    expect(repository.createManualFinanceOperation).toHaveBeenCalledWith(
      "org-1",
      "owner-user",
      expect.objectContaining({
        paymentMethodId: "method-cash"
      })
    );
    expect(audit.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ role: "ADMIN" }),
      expect.objectContaining({
        entityType: "FinanceOperation",
        action: "CREATE",
        afterJson: expect.objectContaining({
          paymentMethodName: "Наличные"
        })
      })
    );
  });

  it("rejects managers and masters from finance", async () => {
    await expect(
      getFinanceOverview({
        ...ownerAuth,
        role: "MANAGER",
        user: {
          ...ownerAuth.user,
          role: "MANAGER"
        }
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });

    expect(repository.getFinanceData).not.toHaveBeenCalled();
  });
});
