import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  createExpenseCategory: vi.fn(),
  createMasterMember: vi.fn(),
  createPaymentMethod: vi.fn(),
  findActiveExpenseCategory: vi.fn(),
  findActivePaymentMethod: vi.fn(),
  findMemberById: vi.fn(),
  findUserWithOrganizationMembership: vi.fn(),
  getOrCreateOrganizationSettings: vi.fn(),
  listExpenseCategories: vi.fn(),
  listMasterMembers: vi.fn(),
  listPaymentMethods: vi.fn(),
  reactivateMasterMember: vi.fn(),
  updateExpenseCategory: vi.fn(),
  updateMasterMember: vi.fn(),
  updateOrganizationTaxSettings: vi.fn(),
  updatePaymentMethod: vi.fn()
}));

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../audit/service.js", () => audit);

const {
  addExpenseCategory,
  addPaymentMethod,
  assertActivePaymentMethod,
  editExpenseCategory,
  editPaymentMethod,
  getPaymentMethods
} = await import("./service.js");

const adminAuth: AuthContext = {
  userId: "user-1",
  membershipId: "membership-1",
  organizationId: "org-1",
  role: "ADMIN",
  user: {
    id: "user-1",
    email: "admin@orchid.local",
    name: "Admin",
    role: "ADMIN",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  }
};

function paymentMethodRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-method-1",
    organizationId: "org-1",
    name: "Наличные",
    isActive: true,
    sortOrder: 10,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

function expenseCategoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "expense-category-1",
    organizationId: "org-1",
    name: "Materials",
    color: "#7dd3fc",
    isActive: true,
    sortOrder: 20,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

describe("reference settings audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes audit when a payment method is created", async () => {
    repository.createPaymentMethod.mockResolvedValue(paymentMethodRecord());

    await expect(
      addPaymentMethod(adminAuth, {
        name: "Наличные",
        sortOrder: 10
      })
    ).resolves.toMatchObject({
      id: "payment-method-1",
      name: "Наличные"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(adminAuth, {
      entityType: "PaymentMethod",
      entityId: "payment-method-1",
      action: "CREATE",
      afterJson: expect.objectContaining({
        name: "Наличные",
        isActive: true,
        sortOrder: 10
      }),
      comment: "Payment method created"
    });
  });

  it("writes delete audit when an expense category is deactivated", async () => {
    repository.updateExpenseCategory.mockResolvedValue(
      expenseCategoryRecord({
        isActive: false,
        updatedAt: new Date("2026-06-01T11:00:00.000Z")
      })
    );

    await expect(
      editExpenseCategory(adminAuth, "expense-category-1", {
        name: "Materials",
        color: "#7dd3fc",
        isActive: false,
        sortOrder: 20
      })
    ).resolves.toMatchObject({
      id: "expense-category-1",
      isActive: false
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(adminAuth, {
      entityType: "ExpenseCategory",
      entityId: "expense-category-1",
      action: "DELETE",
      afterJson: expect.objectContaining({
        name: "Materials",
        isActive: false,
        sortOrder: 20
      }),
      comment: "Expense category deactivated"
    });
  });

  it("writes delete audit when a payment method is deactivated", async () => {
    repository.updatePaymentMethod.mockResolvedValue(
      paymentMethodRecord({
        isActive: false,
        updatedAt: new Date("2026-06-01T11:00:00.000Z")
      })
    );

    await expect(
      editPaymentMethod(adminAuth, "payment-method-1", {
        name: "Наличные",
        isActive: false,
        sortOrder: 10
      })
    ).resolves.toMatchObject({
      id: "payment-method-1",
      isActive: false
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(adminAuth, {
      entityType: "PaymentMethod",
      entityId: "payment-method-1",
      action: "DELETE",
      afterJson: expect.objectContaining({
        name: "Наличные",
        isActive: false,
        sortOrder: 10
      }),
      comment: "Payment method deactivated"
    });
  });

  it("lists only cash and transfer payment methods", async () => {
    repository.listPaymentMethods.mockResolvedValue([
      paymentMethodRecord({
        id: "payment-method-cash",
        name: "Наличные",
        sortOrder: 10
      }),
      paymentMethodRecord({
        id: "payment-method-terminal",
        name: "Терминал",
        sortOrder: 20
      }),
      paymentMethodRecord({
        id: "payment-method-transfer",
        name: "Перевод",
        sortOrder: 30
      })
    ]);

    await expect(getPaymentMethods(adminAuth)).resolves.toMatchObject({
      items: [
        {
          id: "payment-method-cash",
          name: "Наличные"
        },
        {
          id: "payment-method-transfer",
          name: "Перевод"
        }
      ]
    });
  });

  it("rejects unsupported active payment methods for money operations", async () => {
    repository.findActivePaymentMethod.mockResolvedValue(
      paymentMethodRecord({
        id: "payment-method-terminal",
        name: "Терминал"
      })
    );

    await expect(assertActivePaymentMethod("org-1", "payment-method-terminal")).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it("writes audit when an expense category is created", async () => {
    repository.createExpenseCategory.mockResolvedValue(expenseCategoryRecord());

    await expect(
      addExpenseCategory(adminAuth, {
        name: " Materials ",
        color: "#7dd3fc",
        sortOrder: 20
      })
    ).resolves.toMatchObject({
      id: "expense-category-1",
      name: "Materials"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(adminAuth, {
      entityType: "ExpenseCategory",
      entityId: "expense-category-1",
      action: "CREATE",
      afterJson: expect.objectContaining({
        name: "Materials",
        isActive: true,
        sortOrder: 20
      }),
      comment: "Expense category created"
    });
  });
});
