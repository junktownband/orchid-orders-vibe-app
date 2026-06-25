import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  createManualFinanceOperation: vi.fn(),
  getFinanceData: vi.fn()
}));

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../audit/service.js", () => audit);

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
    averagePaidTicketCents: 150_000,
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
    operations: [
      {
        id: "payment-1",
        source: "PAYMENT",
        type: "PAYMENT_RECEIVED",
        direction: "IN",
        amountCents: 300_000,
        occurredAt: new Date("2026-06-10T10:00:00.000Z"),
        description: "Оплата заказа № 00001",
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
      ]
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
      occurredAt: new Date("2026-06-12T10:00:00.000Z"),
      description: "Стартовый остаток",
      comment: null,
      createdAt: new Date("2026-06-12T10:00:00.000Z"),
      updatedAt: new Date("2026-06-12T10:00:00.000Z"),
      createdBy: {
        name: "Owner"
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

    expect(audit.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ role: "ADMIN" }),
      expect.objectContaining({
        entityType: "FinanceOperation",
        action: "CREATE"
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
