import { describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import {
  calculateServiceCommissionBaseCents,
  orderNumberSearchTerms,
  recalculateIssuedOrderCommissionsTx
} from "./repository.js";
import { allocateFinalRevenueByItem, allocateTaxByItem } from "./commission-calculation.js";

describe("repair order routes", () => {
  it("rejects list requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/repair-orders"
    });

    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing access token",
        details: [],
        errors: []
      }
    });
  });

  it("rejects order audit requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/repair-orders/repair-1/audit"
    });

    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing access token",
        details: [],
        errors: []
      }
    });
  });

  it("normalizes human order number search terms", () => {
    expect(orderNumberSearchTerms("? 0001")).toEqual(expect.arrayContaining(["0001", "1", "00001", "R-0001", "R-00001"]));
    expect(orderNumberSearchTerms("R-0001")).toEqual(expect.arrayContaining(["0001", "1", "00001", "R-0001", "R-00001"]));
  });

  it("calculates service commission base after tax and item expenses", () => {
    expect(
      calculateServiceCommissionBaseCents({
        allocatedRevenueCents: 120_000,
        allocatedTaxCents: 4_800,
        costCents: 10_000,
        confirmedRegularExpenseCents: 5_000
      })
    ).toBe(100_200);
  });

  it("allocates tax from the final paid amount before commission calculation", () => {
    const items = [
      {
        id: "item-1",
        priceCents: 800_000
      },
      {
        id: "item-2",
        priceCents: 400_000
      }
    ];
    const revenueByItemId = allocateFinalRevenueByItem(items, 1_200_000);
    const taxByItemId = allocateTaxByItem(items, revenueByItemId, 1_200_000, 48_000);

    expect(revenueByItemId.get("item-1")).toBe(800_000);
    expect(revenueByItemId.get("item-2")).toBe(400_000);
    expect(taxByItemId.get("item-1")).toBe(32_000);
    expect(taxByItemId.get("item-2")).toBe(16_000);
    expect(
      calculateServiceCommissionBaseCents({
        allocatedRevenueCents: revenueByItemId.get("item-1") ?? 0,
        allocatedTaxCents: taxByItemId.get("item-1") ?? 0,
        costCents: 50_000,
        confirmedRegularExpenseCents: 100_000
      })
    ).toBe(618_000);
  });

  it("recalculates unpaid issued-order service commissions after confirmed item expenses", async () => {
    const now = new Date("2026-06-03T10:00:00.000Z");
    const repairOrderUpdate = vi.fn().mockResolvedValue({});
    const repairOrderItemUpdate = vi.fn().mockResolvedValue({});
    const tx = {
      repairOrder: {
        findFirst: vi.fn().mockResolvedValue({
          id: "order-1",
          totalAmountCents: 120_000,
          taxAmountCents: 4_800,
          lineItems: [
            {
              id: "item-1",
              type: "SERVICE",
              priceCents: 120_000,
              costCents: 10_000,
              commissionPercentSnapshot: 0.3,
              commissionAmountCents: 36_000,
              commissionPayoutStatus: "UNPAID",
              assignedMaster: null,
              expenses: [{ amountCents: 5_000 }]
            }
          ]
        }),
        update: repairOrderUpdate
      },
      repairOrderItem: {
        update: repairOrderItemUpdate
      }
    } as unknown as Parameters<typeof recalculateIssuedOrderCommissionsTx>[0];

    await expect(recalculateIssuedOrderCommissionsTx(tx, "org-1", "order-1", now)).resolves.toEqual({
      repairOrderId: "order-1",
      actualCommissionCents: 30_060
    });
    expect(repairOrderItemUpdate).toHaveBeenCalledWith({
      where: {
        id: "item-1"
      },
      data: {
        commissionPercentSnapshot: 0.3,
        commissionBaseCents: 100_200,
        commissionAmountCents: 30_060,
        commissionCalculatedAt: now,
        commissionPayoutStatus: "UNPAID",
        commissionPaidAt: null,
        commissionPaidByUserId: null
      }
    });
    expect(repairOrderUpdate).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        organizationId: "org-1"
      },
      data: {
        actualCommissionCents: 30_060
      }
    });
  });
});
