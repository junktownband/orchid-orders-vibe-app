import { beforeEach, describe, expect, it, vi } from "vitest";

const authRepository = vi.hoisted(() => ({
  findMembershipContext: vi.fn(),
  findUserForLogin: vi.fn()
}));

const repairOrdersRepository = vi.hoisted(() => ({
  addRepairOrderPayment: vi.fn(),
  countRepairOrders: vi.fn(),
  createRepairOrder: vi.fn(),
  decodeRepairOrderCursor: vi.fn(),
  findMaster: vi.fn(),
  findMastersByIds: vi.fn(),
  findRepairOrder: vi.fn(),
  findServiceCatalogItems: vi.fn(),
  issueRepairOrder: vi.fn(),
  listMasters: vi.fn(),
  listRepairOrders: vi.fn(),
  replaceRepairOrderItems: vi.fn(),
  updateRepairOrderMaster: vi.fn(),
  updateRepairOrderStatus: vi.fn()
}));

const settingsRepository = vi.hoisted(() => ({
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

const expensesRepository = vi.hoisted(() => ({
  confirmExpense: vi.fn(),
  createExpense: vi.fn(),
  findExpenseRepairOrder: vi.fn(),
  findExpenseRepairOrderItem: vi.fn(),
  listExpenses: vi.fn()
}));

const serviceCatalogRepository = vi.hoisted(() => ({
  createServiceCatalogItem: vi.fn(),
  findServiceCatalogItem: vi.fn(),
  listServiceCatalogItems: vi.fn(),
  updateServiceCatalogItem: vi.fn()
}));

const commissionsRepository = vi.hoisted(() => ({
  listMasterCommissions: vi.fn(),
  markMasterCommissionPaid: vi.fn(),
  markMasterCommissionsPaid: vi.fn(),
  summarizeMasterCommissions: vi.fn()
}));

const auditService = vi.hoisted(() => ({
  getAuditLogs: vi.fn(),
  writeAuditLog: vi.fn()
}));

vi.mock("../modules/auth/repository.js", () => authRepository);
vi.mock("../modules/repair-orders/repository.js", () => repairOrdersRepository);
vi.mock("../modules/settings/repository.js", () => settingsRepository);
vi.mock("../modules/expenses/repository.js", () => expensesRepository);
vi.mock("../modules/service-catalog/repository.js", () => serviceCatalogRepository);
vi.mock("../modules/commissions/repository.js", () => commissionsRepository);
vi.mock("../modules/audit/service.js", () => auditService);

const { buildApp } = await import("../app.js");
const { signAccessToken } = await import("../modules/auth/tokens.js");

const authPayload = {
  userId: "owner-1",
  membershipId: "membership-1",
  organizationId: "org-1",
  role: "OWNER"
};

const authHeader = `Bearer ${signAccessToken(authPayload)}`;

function authContext() {
  return {
    id: "membership-1",
    userId: "owner-1",
    organizationId: "org-1",
    role: "OWNER",
    user: {
      id: "owner-1",
      email: "sasha@orchid.local",
      name: "Саша"
    },
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  };
}

function repairOrderRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "repair-1",
    orderNumber: "00001",
    title: null,
    description: "Setup",
    totalAmountCents: 120_000,
    totalCostCents: 20_000,
    grossProfitCents: 100_000,
    repairStatus: "ACCEPTED",
    paymentStatus: "UNPAID",
    paidAt: null,
    issuedAt: null,
    taxModeSnapshot: null,
    taxSubject: null,
    taxRateBps: null,
    taxAmountCents: null,
    paidBy: null,
    assignedMasterMembershipId: null,
    assignedMaster: null,
    customer: {
      id: "customer-1",
      name: "Customer",
      phone: null,
      email: null,
      note: null
    },
    instrument: null,
    lineItems: [
      {
        id: "item-1",
        serviceCatalogItemId: "service-1",
        assignedMasterMembershipId: "member-1",
        assignedMaster: {
          user: {
            name: "Master 1"
          }
        },
        nameSnapshot: "Setup",
        type: "SERVICE",
        priceCents: 120_000,
        costCents: 20_000,
        commissionPercentSnapshot: null,
        commissionBaseCents: null,
        commissionAmountCents: null,
        commissionCalculatedAt: null,
        commissionPayoutStatus: "UNPAID",
        commissionPaidAt: null,
        commissionPaidBy: null
      }
    ],
    payments: [],
    createdAt: new Date("2026-06-15T08:00:00.000Z"),
    updatedAt: new Date("2026-06-15T08:00:00.000Z"),
    ...overrides
  };
}

function paidOrderRecord(overrides: Record<string, unknown> = {}) {
  return repairOrderRecord({
    paymentStatus: "PAID",
    paidAt: new Date("2026-06-15T09:00:00.000Z"),
    paidBy: {
      name: "Owner"
    },
    payments: [
      {
        id: "payment-1",
        amountCents: 120_000,
        paidAt: new Date("2026-06-15T09:00:00.000Z"),
        paymentMethodId: "method-1",
        paymentMethod: {
          name: "Наличные"
        },
        acceptedBy: {
          name: "Owner"
        },
        comment: null
      }
    ],
    ...overrides
  });
}

function expenseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "expense-1",
    amountCents: 10_000,
    spentAt: new Date("2026-06-15T10:00:00.000Z"),
    spentByName: null,
    description: "Materials",
    kind: "REGULAR",
    status: "CONFIRMED",
    categoryId: "category-1",
    category: {
      name: "Materials",
      color: "#67e8f9"
    },
    paymentMethodId: "method-1",
    paymentMethod: {
      name: "Наличные"
    },
    repairOrderId: "repair-1",
    repairOrder: {
      orderNumber: "00001"
    },
    repairOrderItemId: "item-1",
    repairOrderItem: {
      nameSnapshot: "Setup"
    },
    confirmedAt: new Date("2026-06-15T10:05:00.000Z"),
    createdAt: new Date("2026-06-15T10:00:00.000Z"),
    updatedAt: new Date("2026-06-15T10:05:00.000Z"),
    ...overrides
  };
}

function serviceCatalogRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "service-1",
    organizationId: "org-1",
    name: "Setup",
    type: "SERVICE",
    defaultPriceCents: 120_000,
    defaultCostCents: 20_000,
    isActive: true,
    sortOrder: 100,
    createdAt: new Date("2026-06-15T08:00:00.000Z"),
    updatedAt: new Date("2026-06-15T08:00:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

function commissionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    repairOrderId: "repair-1",
    nameSnapshot: "Setup",
    assignedMasterMembershipId: "member-1",
    assignedMaster: {
      user: {
        name: "Master 1"
      }
    },
    commissionBaseCents: 100_000,
    commissionAmountCents: 30_000,
    commissionPercentSnapshot: 0.3,
    commissionCalculatedAt: new Date("2026-06-15T10:00:00.000Z"),
    commissionPayoutStatus: "PAID",
    commissionPaidAt: new Date("2026-06-15T11:00:00.000Z"),
    commissionPaidBy: {
      name: "Owner"
    },
    repairOrder: {
      orderNumber: "00001",
      issuedAt: new Date("2026-06-15T10:00:00.000Z"),
      customer: {
        name: "Customer"
      }
    },
    ...overrides
  };
}

describe("API workflow smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authRepository.findMembershipContext.mockResolvedValue(authContext());
    repairOrdersRepository.findMastersByIds.mockResolvedValue([{ id: "member-1" }]);
    repairOrdersRepository.findServiceCatalogItems.mockResolvedValue([{ id: "service-1" }]);
    settingsRepository.findActivePaymentMethod.mockResolvedValue({ id: "method-1", name: "Наличные" });
    settingsRepository.findActiveExpenseCategory.mockResolvedValue({ id: "category-1" });
    settingsRepository.getOrCreateOrganizationSettings.mockResolvedValue({ taxMode: "NONE" });
    auditService.writeAuditLog.mockResolvedValue(undefined);
  });

  it("covers order create, payment, issue, expense confirmation, service catalog, and bulk payout routes", async () => {
    const app = buildApp();
    await app.ready();

    repairOrdersRepository.countRepairOrders.mockResolvedValue(0);
    repairOrdersRepository.createRepairOrder.mockResolvedValue(repairOrderRecord());

    const createOrder = await app.inject({
      method: "POST",
      url: "/api/v1/repair-orders",
      headers: {
        authorization: authHeader
      },
      payload: {
        customer: {
          name: "Customer"
        },
        description: "Setup",
        items: [
          {
            serviceCatalogItemId: "service-1",
            assignedMasterMembershipId: "member-1",
            name: "Setup",
            type: "SERVICE",
            priceCents: 120_000,
            costCents: 20_000
          }
        ]
      }
    });

    expect(createOrder.statusCode).toBe(201);
    expect(createOrder.json()).toMatchObject({
      id: "repair-1",
      orderNumber: "00001"
    });

    repairOrdersRepository.addRepairOrderPayment.mockResolvedValue(paidOrderRecord());
    const markPaid = await app.inject({
      method: "POST",
      url: "/api/v1/repair-orders/repair-1/mark-paid",
      headers: {
        authorization: authHeader
      },
      payload: {
        paymentMethodId: "method-1",
        amountCents: 120_000
      }
    });

    expect(markPaid.statusCode).toBe(200);
    expect(markPaid.json()).toMatchObject({
      paymentStatus: "PAID",
      balanceDueCents: 0
    });

    repairOrdersRepository.findRepairOrder.mockResolvedValue(paidOrderRecord());
    repairOrdersRepository.issueRepairOrder.mockResolvedValue(
      paidOrderRecord({
        repairStatus: "ISSUED",
        issuedAt: new Date("2026-06-15T10:00:00.000Z")
      })
    );
    const issueOrder = await app.inject({
      method: "POST",
      url: "/api/v1/repair-orders/repair-1/issue",
      headers: {
        authorization: authHeader
      },
      payload: {}
    });

    expect(issueOrder.statusCode).toBe(200);
    expect(issueOrder.json()).toMatchObject({
      repairStatus: "ISSUED",
      paymentStatus: "PAID"
    });

    expensesRepository.confirmExpense.mockResolvedValue(expenseRecord());
    const confirmExpense = await app.inject({
      method: "POST",
      url: "/api/v1/expenses/expense-1/confirm",
      headers: {
        authorization: authHeader
      }
    });

    expect(confirmExpense.statusCode).toBe(200);
    expect(confirmExpense.json()).toMatchObject({
      id: "expense-1",
      status: "CONFIRMED"
    });

    serviceCatalogRepository.createServiceCatalogItem.mockResolvedValue(serviceCatalogRecord());
    const createService = await app.inject({
      method: "POST",
      url: "/api/v1/service-catalog",
      headers: {
        authorization: authHeader
      },
      payload: {
        name: "Setup",
        type: "SERVICE",
        defaultPriceCents: 120_000,
        defaultCostCents: 20_000
      }
    });

    expect(createService.statusCode).toBe(201);
    expect(createService.json()).toMatchObject({
      id: "service-1",
      name: "Setup"
    });

    commissionsRepository.markMasterCommissionsPaid.mockResolvedValue([commissionRecord()]);
    const bulkPayout = await app.inject({
      method: "POST",
      url: "/api/v1/commissions/bulk-mark-paid",
      headers: {
        authorization: authHeader
      },
      payload: {
        repairOrderItemIds: ["item-1"]
      }
    });

    expect(bulkPayout.statusCode).toBe(200);
    expect(bulkPayout.json()).toMatchObject({
      paidCount: 1,
      paidCents: 30_000
    });

    await app.close();
  });
});
