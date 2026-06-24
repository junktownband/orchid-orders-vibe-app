import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const mocks = vi.hoisted(() => ({
  getDashboardData: vi.fn()
}));

vi.mock("./repository.js", () => ({
  getDashboardData: mocks.getDashboardData
}));

const { getDashboard } = await import("./service.js");

const auth: AuthContext = {
  userId: "user-1",
  membershipId: "membership-1",
  organizationId: "org-1",
  role: "OWNER",
  user: {
    id: "user-1",
    email: "sasha@orchid.local",
    name: "Саша",
    role: "OWNER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "UTC"
    }
  }
};

describe("dashboard finance", () => {
  beforeEach(() => {
    mocks.getDashboardData.mockReset();
  });

  it("subtracts paid salary expenses through confirmed expenses and only unpaid commissions separately", async () => {
    mocks.getDashboardData.mockResolvedValue({
      orders: [
        {
          totalAmountCents: 100_000,
          paymentStatus: "PAID"
        }
      ],
      paidOrders: [
        {
          totalAmountCents: 100_000,
          totalCostCents: 20_000,
          grossProfitCents: 80_000,
          actualCommissionCents: null,
          lineItems: [
            {
              type: "SERVICE",
              priceCents: 100_000,
              costCents: 20_000,
              commissionAmountCents: 20_000,
              commissionPayoutStatus: "PAID"
            },
            {
              type: "SERVICE",
              priceCents: 0,
              costCents: 0,
              commissionAmountCents: 30_000,
              commissionPayoutStatus: "UNPAID"
            }
          ]
        }
      ],
      acceptedPayments: [
        {
          amountCents: 70_000,
          repairOrderId: "order-1"
        },
        {
          amountCents: 30_000,
          repairOrderId: "order-1"
        }
      ],
      confirmedExpensesCents: 30_000,
      accruedCommissionItems: [
        {
          commissionAmountCents: 20_000,
          commissionPayoutStatus: "PAID"
        },
        {
          commissionAmountCents: 30_000,
          commissionPayoutStatus: "UNPAID"
        }
      ],
      paidCommissionItems: [
        {
          commissionAmountCents: 20_000
        }
      ],
      statusGroups: []
    });

    const result = await getDashboard(auth);

    expect(result.kpis.accruedCommissionsCents).toBe(50_000);
    expect(result.kpis.paidCommissionsCents).toBe(20_000);
    expect(result.kpis.payableCommissionsCents).toBe(30_000);
    expect(result.kpis.netCashCents).toBe(40_000);
    expect(result.kpis).not.toHaveProperty("accountsReceivableCents");
  });

  it("uses actual accepted payments for cash revenue instead of full paid order totals", async () => {
    mocks.getDashboardData.mockResolvedValue({
      orders: [
        {
          totalAmountCents: 200_000,
          paymentStatus: "PARTIALLY_PAID"
        }
      ],
      paidOrders: [],
      acceptedPayments: [
        {
          amountCents: 50_000,
          repairOrderId: "order-1"
        }
      ],
      confirmedExpensesCents: 10_000,
      accruedCommissionItems: [],
      paidCommissionItems: [],
      statusGroups: []
    });

    const result = await getDashboard(auth);

    expect(result.kpis.paidRevenueCents).toBe(50_000);
    expect(result.kpis.netCashCents).toBe(40_000);
    expect(result.kpis.averagePaidTicketCents).toBe(50_000);
  });

  it("rejects dashboard access for master role", async () => {
    await expect(
      getDashboard({
        ...auth,
        role: "MASTER",
        user: {
          ...auth.user,
          role: "MASTER"
        }
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });
    expect(mocks.getDashboardData).not.toHaveBeenCalled();
  });
});
