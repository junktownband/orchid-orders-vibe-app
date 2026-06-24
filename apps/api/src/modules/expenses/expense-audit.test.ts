import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  confirmExpense: vi.fn(),
  createExpense: vi.fn(),
  findExpenseRepairOrder: vi.fn(),
  findExpenseRepairOrderItem: vi.fn(),
  listExpenses: vi.fn(),
  voidExpense: vi.fn()
}));

const settingsService = vi.hoisted(() => ({
  assertActiveExpenseCategory: vi.fn(),
  assertActivePaymentMethod: vi.fn()
}));

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../settings/service.js", () => settingsService);
vi.mock("../audit/service.js", () => audit);

const { addExpense, setExpenseConfirmed, setExpenseVoided } = await import("./service.js");

const auth: AuthContext = {
  userId: "user-1",
  membershipId: "membership-1",
  organizationId: "org-1",
  role: "MANAGER",
  user: {
    id: "user-1",
    email: "manager@orchid.local",
    name: "Manager",
    role: "MANAGER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "UTC"
    }
  }
};

function expenseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "expense-1",
    organizationId: "org-1",
    createdByUserId: "user-1",
    amountCents: 12_000,
    spentAt: new Date("2026-06-01T10:00:00.000Z"),
    spentByName: null,
    description: "Strings",
    comment: null,
    kind: "REGULAR",
    status: "DRAFT",
    categoryId: "category-1",
    category: {
      name: "Materials",
      color: "#7dd3fc"
    },
    paymentMethodId: "method-1",
    paymentMethod: {
      name: "Cash"
    },
    repairOrderId: "order-1",
    repairOrder: {
      id: "order-1",
      orderNumber: "00001"
    },
    repairOrderItemId: "item-1",
    repairOrderItem: {
      id: "item-1",
      nameSnapshot: "Setup"
    },
    confirmedAt: null,
    voidedAt: null,
    voidReason: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

describe("expense audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.assertActiveExpenseCategory.mockResolvedValue({ id: "category-1" });
    settingsService.assertActivePaymentMethod.mockResolvedValue({ id: "method-1" });
  });

  it("writes audit when an expense is created", async () => {
    repository.findExpenseRepairOrder.mockResolvedValue({ id: "order-1" });
    repository.findExpenseRepairOrderItem.mockResolvedValue({
      id: "item-1",
      repairOrderId: "order-1"
    });
    repository.createExpense.mockResolvedValue(expenseRecord());

    await expect(
      addExpense(auth, {
        description: "Strings",
        amountCents: 12_000,
        categoryId: "category-1",
        paymentMethodId: "method-1",
        repairOrderId: "order-1",
        repairOrderItemId: "item-1"
      })
    ).resolves.toMatchObject({
      id: "expense-1",
      status: "DRAFT"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "Expense",
      entityId: "expense-1",
      action: "CREATE",
      afterJson: {
        amountCents: 12_000,
        repairOrderId: "order-1",
        repairOrderItemId: "item-1",
        status: "DRAFT"
      },
      comment: "Expense created"
    });
  });

  it("writes audit when an expense is confirmed", async () => {
    repository.confirmExpense.mockResolvedValue(
      expenseRecord({
        status: "CONFIRMED",
        confirmedAt: new Date("2026-06-01T11:00:00.000Z")
      })
    );

    await expect(setExpenseConfirmed(auth, "expense-1")).resolves.toMatchObject({
      id: "expense-1",
      status: "CONFIRMED"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "Expense",
      entityId: "expense-1",
      action: "CONFIRM",
      afterJson: {
        status: "CONFIRMED",
        confirmedAt: "2026-06-01T11:00:00.000Z",
        amountCents: 12_000,
        repairOrderId: "order-1",
        repairOrderItemId: "item-1"
      },
      comment: "Expense confirmed"
    });
  });

  it("writes audit when an expense is voided", async () => {
    repository.voidExpense.mockResolvedValue(
      expenseRecord({
        status: "VOIDED",
        voidedAt: new Date("2026-06-01T12:00:00.000Z"),
        voidReason: "Wrong receipt"
      })
    );

    await expect(
      setExpenseVoided(auth, "expense-1", {
        reason: "Wrong receipt"
      })
    ).resolves.toMatchObject({
      id: "expense-1",
      status: "VOIDED",
      voidReason: "Wrong receipt"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "Expense",
      entityId: "expense-1",
      action: "VOID",
      afterJson: {
        status: "VOIDED",
        voidedAt: "2026-06-01T12:00:00.000Z",
        voidReason: "Wrong receipt",
        amountCents: 12_000,
        repairOrderId: "order-1",
        repairOrderItemId: "item-1"
      },
      comment: "Expense voided"
    });
  });
});
