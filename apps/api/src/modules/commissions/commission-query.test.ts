import { describe, expect, it } from "vitest";

import { markMasterCommissionsPaidSchema, masterCommissionQuerySchema } from "@orchid/shared";

describe("master commission query schema", () => {
  it("accepts payout register filters", () => {
    expect(
      masterCommissionQuerySchema.parse({
        masterMembershipId: "member-1",
        payoutStatus: "UNPAID",
        from: "2026-06-01",
        to: "2026-06-30"
      })
    ).toEqual({
      masterMembershipId: "member-1",
      payoutStatus: "UNPAID",
      from: "2026-06-01",
      to: "2026-06-30"
    });
  });

  it("rejects invalid payout period ranges", () => {
    expect(() =>
      masterCommissionQuerySchema.parse({
        from: "2026-07-01",
        to: "2026-06-30"
      })
    ).toThrow();
  });

  it("accepts bulk payout item ids", () => {
    expect(
      markMasterCommissionsPaidSchema.parse({
        repairOrderItemIds: ["item-1", "item-2"]
      })
    ).toEqual({
      repairOrderItemIds: ["item-1", "item-2"]
    });
  });

  it("accepts bulk payout batches larger than one register page", () => {
    const repairOrderItemIds = Array.from({ length: 101 }, (_, index) => `item-${index + 1}`);

    expect(
      markMasterCommissionsPaidSchema.parse({
        repairOrderItemIds
      })
    ).toEqual({
      repairOrderItemIds
    });
  });
});
