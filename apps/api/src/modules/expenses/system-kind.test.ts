import { describe, expect, it } from "vitest";

import { addRepairOrderPaymentSchema, createExpenseSchema, issueRepairOrderSchema, voidExpenseSchema, voidRepairOrderPaymentSchema } from "@orchid/shared";

describe("expense public create schema", () => {
  it("allows regular manual expenses without kind", () => {
    expect(
      createExpenseSchema.safeParse({
        description: "Materials",
        amountCents: 10_000
      }).success
    ).toBe(true);
  });

  it("rejects system expense kinds from public create payloads", () => {
    for (const kind of ["TAX", "SALARY"]) {
      expect(
        createExpenseSchema.safeParse({
          description: "System expense",
          amountCents: 10_000,
          kind
        }).success
      ).toBe(false);
    }
  });
});

describe("repair order payment schemas", () => {
  it("requires payment method when accepting a payment", () => {
    expect(addRepairOrderPaymentSchema.safeParse({ amountCents: 10_000 }).success).toBe(false);
    expect(
      addRepairOrderPaymentSchema.safeParse({
        amountCents: 10_000,
        paymentMethodId: "method-1"
      }).success
    ).toBe(true);
  });

  it("allows issue payload to omit payment method because service decides by paid remainder", () => {
    expect(issueRepairOrderSchema.safeParse({}).success).toBe(true);
  });

  it("requires a reason for payment and expense void actions", () => {
    expect(voidRepairOrderPaymentSchema.safeParse({ reason: "Duplicate operation" }).success).toBe(true);
    expect(voidExpenseSchema.safeParse({ reason: "Wrong receipt" }).success).toBe(true);
    expect(voidRepairOrderPaymentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(voidExpenseSchema.safeParse({ reason: "" }).success).toBe(false);
  });
});
