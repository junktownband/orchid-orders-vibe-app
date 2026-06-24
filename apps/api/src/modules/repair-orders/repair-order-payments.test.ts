import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
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
  updateRepairOrderStatus: vi.fn(),
  voidRepairOrderPayment: vi.fn()
}));

const settingsRepository = vi.hoisted(() => ({
  getOrCreateOrganizationSettings: vi.fn()
}));

const settingsService = vi.hoisted(() => ({
  assertActivePaymentMethod: vi.fn()
}));

const audit = vi.hoisted(() => ({
  getAuditLogs: vi.fn(),
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../settings/repository.js", () => settingsRepository);
vi.mock("../settings/service.js", () => settingsService);
vi.mock("../audit/service.js", () => audit);

const {
  addRepairOrder,
  getRepairOrderById,
  getRepairOrders,
  setRepairOrderItems,
  setRepairOrderIssued,
  setRepairOrderMaster,
  setRepairOrderPaid,
  setRepairOrderPaymentVoided,
  setRepairOrderStatus
} = await import("./service.js");

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

const masterAuth: AuthContext = {
  ...auth,
  userId: "master-user",
  membershipId: "master-membership",
  role: "MASTER",
  user: {
    ...auth.user,
    id: "master-user",
    email: "master@orchid.local",
    name: "Master",
    role: "MASTER"
  }
};

const ownerAuth: AuthContext = {
  ...auth,
  userId: "owner-user",
  membershipId: "owner-membership",
  role: "OWNER",
  user: {
    ...auth.user,
    id: "owner-user",
    email: "sasha@orchid.local",
    name: "Саша",
    role: "OWNER"
  }
};

function repairOrderRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderNumber: "00001",
    title: null,
    description: "Setup",
    totalAmountCents: 100_000,
    totalCostCents: 10_000,
    grossProfitCents: 90_000,
    repairStatus: "READY",
    paymentStatus: "PARTIALLY_PAID",
    paidAt: new Date("2026-06-01T10:00:00.000Z"),
    issuedAt: null,
    taxModeSnapshot: null,
    taxSubject: null,
    taxRateBps: null,
    taxAmountCents: null,
    paidBy: {
      name: "Manager"
    },
    assignedMasterMembershipId: null,
    assignedMaster: null,
    customer: null,
    instrument: null,
    lineItems: [],
    payments: [
      {
        id: "payment-1",
        amountCents: 40_000,
        paidAt: new Date("2026-06-01T10:00:00.000Z"),
        paymentMethodId: "method-1",
        paymentMethod: {
          name: "Наличные"
        },
        acceptedBy: {
          name: "Manager"
        },
        comment: "Предоплата"
      }
    ],
    createdAt: new Date("2026-06-01T09:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides
  };
}

describe("repair order payments", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    settingsRepository.getOrCreateOrganizationSettings.mockResolvedValue({
      taxMode: "NONE"
    });
    settingsService.assertActivePaymentMethod.mockResolvedValue({
      id: "method-1"
    });
  });

  it("requires payment method when issuing an order with unpaid remainder", async () => {
    repository.findRepairOrder.mockResolvedValue(repairOrderRecord());

    await expect(setRepairOrderIssued(auth, "order-1", {})).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      statusCode: 400
    });
    expect(repository.issueRepairOrder).not.toHaveBeenCalled();
  });

  it("does not require payment method when prepayment already covers the order total", async () => {
    const fullyPrepaidOrder = repairOrderRecord({
      paymentStatus: "PAID",
      payments: [
        {
          id: "payment-1",
          amountCents: 100_000,
          paidAt: new Date("2026-06-01T10:00:00.000Z"),
          paymentMethodId: "method-1",
          paymentMethod: {
            name: "Наличные"
          },
          acceptedBy: {
            name: "Manager"
          },
          comment: null
        }
      ]
    });
    repository.findRepairOrder.mockResolvedValue(fullyPrepaidOrder);
    repository.issueRepairOrder.mockResolvedValue({
      ...fullyPrepaidOrder,
      repairStatus: "ISSUED",
      paymentStatus: "PAID",
      issuedAt: new Date("2026-06-02T10:00:00.000Z")
    });

    await expect(setRepairOrderIssued(auth, "order-1", {})).resolves.toMatchObject({
      paymentStatus: "PAID",
      paidAmountCents: 100_000,
      balanceDueCents: 0
    });
    expect(repository.issueRepairOrder).toHaveBeenCalledWith(
      "org-1",
      "order-1",
      expect.objectContaining({
        paymentMethodId: null
      })
    );
  });

  it("rejects existing prepayments greater than the order total", async () => {
    repository.findRepairOrder.mockResolvedValue(
      repairOrderRecord({
        payments: [
          {
            id: "payment-1",
            amountCents: 120_000,
            paidAt: new Date("2026-06-01T10:00:00.000Z"),
            paymentMethodId: "method-1",
            paymentMethod: {
              name: "Наличные"
            },
            acceptedBy: {
              name: "Manager"
            },
            comment: null
          }
        ]
      })
    );

    await expect(setRepairOrderIssued(auth, "order-1", {})).rejects.toMatchObject({
      code: "BUSINESS_RULE_VIOLATION",
      statusCode: 422
    });
    expect(repository.issueRepairOrder).not.toHaveBeenCalled();
  });

  it("records partial payments with payment method and amount", async () => {
    repository.addRepairOrderPayment.mockResolvedValue(repairOrderRecord());

    await expect(
      setRepairOrderPaid(auth, "order-1", {
        amountCents: 40_000,
        paymentMethodId: "method-1",
        comment: "Предоплата"
      })
    ).resolves.toMatchObject({
      paymentStatus: "PARTIALLY_PAID",
      paidAmountCents: 40_000,
      balanceDueCents: 60_000
    });
    expect(settingsService.assertActivePaymentMethod).toHaveBeenCalledWith("org-1", "method-1");
    expect(repository.addRepairOrderPayment).toHaveBeenCalledWith("org-1", "order-1", {
      acceptedByUserId: "user-1",
      amountCents: 40_000,
      comment: "Предоплата",
      paymentMethodId: "method-1"
    });
    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "RepairOrder",
      entityId: "order-1",
      action: "PAYMENT_ADDED",
      afterJson: expect.objectContaining({
        amountCents: 40_000,
        paymentMethodId: "method-1",
        paidAmountCents: 40_000,
        paymentStatus: "PARTIALLY_PAID"
      }),
      comment: "Repair order marked as paid"
    });
  });

  it("rejects payment amounts greater than the order balance", async () => {
    repository.addRepairOrderPayment.mockRejectedValue(new Error("Payment amount exceeds order total"));

    await expect(
      setRepairOrderPaid(auth, "order-1", {
        amountCents: 120_000,
        paymentMethodId: "method-1"
      })
    ).rejects.toMatchObject({
      code: "BUSINESS_RULE_VIOLATION",
      statusCode: 422
    });
  });

  it("allows owner to void a payment and returns recalculated order payment state", async () => {
    repository.findRepairOrder.mockResolvedValue(repairOrderRecord());
    repository.voidRepairOrderPayment.mockResolvedValue(
      repairOrderRecord({
        paymentStatus: "UNPAID",
        paidAt: null,
        paidBy: null,
        payments: []
      })
    );

    await expect(
      setRepairOrderPaymentVoided(ownerAuth, "order-1", "payment-1", {
        reason: "Duplicate terminal operation"
      })
    ).resolves.toMatchObject({
      paymentStatus: "UNPAID",
      paidAmountCents: 0,
      balanceDueCents: 100_000
    });

    expect(repository.voidRepairOrderPayment).toHaveBeenCalledWith("org-1", "order-1", "payment-1", {
      reason: "Duplicate terminal operation"
    });
    expect(audit.writeAuditLog).toHaveBeenCalledWith(ownerAuth, {
      entityType: "RepairOrder",
      entityId: "order-1",
      action: "PAYMENT_VOIDED",
      beforeJson: expect.objectContaining({
        paidAmountCents: 40_000,
        paymentStatus: "PARTIALLY_PAID"
      }),
      afterJson: expect.objectContaining({
        paidAmountCents: 0,
        paymentId: "payment-1",
        paymentStatus: "UNPAID",
        reason: "Duplicate terminal operation"
      }),
      comment: "Repair order payment voided"
    });
  });

  it("blocks manager from voiding payments", async () => {
    await expect(
      setRepairOrderPaymentVoided(auth, "order-1", "payment-1", {
        reason: "Duplicate terminal operation"
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });
    expect(repository.voidRepairOrderPayment).not.toHaveBeenCalled();
  });

  it("retries order number allocation when concurrent creation wins the same number", async () => {
    repository.countRepairOrders.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    repository.createRepairOrder
      .mockRejectedValueOnce({
        code: "P2002",
        meta: {
          target: ["organizationId", "orderNumber"]
        }
      })
      .mockResolvedValueOnce(
        repairOrderRecord({
          orderNumber: "00002",
          totalAmountCents: 120_000,
          grossProfitCents: 120_000
        })
      );

    await expect(
      addRepairOrder(auth, {
        customer: {
          name: "Customer"
        },
        description: "Setup",
        items: [
          {
            name: "Setup",
            type: "SERVICE",
            priceCents: 120_000,
            costCents: 0
          }
        ]
      })
    ).resolves.toMatchObject({
      orderNumber: "00002"
    });

    expect(repository.createRepairOrder).toHaveBeenNthCalledWith(
      1,
      "org-1",
      expect.objectContaining({
        orderNumber: "00001"
      })
    );
    expect(repository.createRepairOrder).toHaveBeenNthCalledWith(
      2,
      "org-1",
      expect.objectContaining({
        orderNumber: "00002"
      })
    );
    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "RepairOrder",
      entityId: "order-1",
      action: "CREATE",
      afterJson: expect.objectContaining({
        orderNumber: "00002",
        totalAmountCents: 120_000
      }),
      comment: "Repair order created"
    });
  });

  it("writes audit when order item price, cost, or assignee changes", async () => {
    repository.findMastersByIds.mockResolvedValue([{ id: "master-2" }]);
    repository.findRepairOrder.mockResolvedValueOnce(
      repairOrderRecord({
        lineItems: [
          {
            id: "item-1",
            serviceCatalogItemId: null,
            assignedMasterMembershipId: "master-1",
            assignedMaster: {
              user: {
                name: "Old Master"
              }
            },
            nameSnapshot: "Setup",
            type: "SERVICE",
            priceCents: 100_000,
            costCents: 10_000,
            commissionPercentSnapshot: null,
            commissionBaseCents: null,
            commissionAmountCents: null,
            commissionCalculatedAt: null,
            commissionPayoutStatus: "UNPAID",
            commissionPaidAt: null,
            commissionPaidBy: null
          }
        ]
      })
    );
    repository.replaceRepairOrderItems.mockResolvedValue(
      repairOrderRecord({
        totalAmountCents: 120_000,
        totalCostCents: 15_000,
        grossProfitCents: 105_000,
        lineItems: [
          {
            id: "item-1",
            serviceCatalogItemId: null,
            assignedMasterMembershipId: "master-2",
            assignedMaster: {
              user: {
                name: "New Master"
              }
            },
            nameSnapshot: "Setup",
            type: "SERVICE",
            priceCents: 120_000,
            costCents: 15_000,
            commissionPercentSnapshot: null,
            commissionBaseCents: null,
            commissionAmountCents: null,
            commissionCalculatedAt: null,
            commissionPayoutStatus: "UNPAID",
            commissionPaidAt: null,
            commissionPaidBy: null
          }
        ]
      })
    );

    await expect(
      setRepairOrderItems(auth, "order-1", {
        items: [
          {
            name: "Setup",
            type: "SERVICE",
            priceCents: 120_000,
            costCents: 15_000,
            assignedMasterMembershipId: "master-2"
          }
        ]
      })
    ).resolves.toMatchObject({
      totalAmountCents: 120_000,
      totalCostCents: 15_000
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "RepairOrder",
      entityId: "order-1",
      action: "UPDATE",
      beforeJson: expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            priceCents: 100_000,
            costCents: 10_000,
            assignedMasterMembershipId: "master-1"
          })
        ])
      }),
      afterJson: expect.objectContaining({
        totalAmountCents: 120_000,
        totalCostCents: 15_000,
        items: expect.arrayContaining([
          expect.objectContaining({
            priceCents: 120_000,
            costCents: 15_000,
            assignedMasterMembershipId: "master-2"
          })
        ])
      }),
      comment: "Repair order items updated"
    });
  });

  it("writes audit when the order master assignment changes", async () => {
    repository.findMaster.mockResolvedValue({
      id: "master-2"
    });
    repository.findRepairOrder.mockResolvedValueOnce(
      repairOrderRecord({
        assignedMasterMembershipId: "master-1",
        assignedMaster: {
          user: {
            name: "Old Master"
          }
        }
      })
    );
    repository.updateRepairOrderMaster.mockResolvedValue(
      repairOrderRecord({
        assignedMasterMembershipId: "master-2",
        assignedMaster: {
          user: {
            name: "New Master"
          }
        }
      })
    );

    await expect(
      setRepairOrderMaster(auth, "order-1", {
        assignedMasterMembershipId: "master-2"
      })
    ).resolves.toMatchObject({
      assignedMasterMembershipId: "master-2",
      assignedMasterName: "New Master"
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "RepairOrder",
      entityId: "order-1",
      action: "UPDATE",
      beforeJson: {
        assignedMasterMembershipId: "master-1",
        assignedMasterName: "Old Master"
      },
      afterJson: {
        assignedMasterMembershipId: "master-2",
        assignedMasterName: "New Master"
      },
      comment: "Repair order assignee updated"
    });
  });

  it("keeps master order list and detail reads transparent", async () => {
    repository.listRepairOrders.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false
    });
    repository.findRepairOrder.mockResolvedValue(null);

    await expect(getRepairOrders(masterAuth, { tab: "all", limit: 20 })).resolves.toEqual({
      items: [],
      nextCursor: null,
      hasMore: false
    });
    await expect(getRepairOrderById(masterAuth, "repair-1")).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404
    });

    const listOptions = repository.listRepairOrders.mock.calls[0]?.[1];

    expect(listOptions).not.toHaveProperty("assignedMasterMembershipId");
    expect(repository.findRepairOrder).toHaveBeenCalledWith("org-1", "repair-1");
  });

  it("allows master to change working repair statuses", async () => {
    repository.updateRepairOrderStatus.mockResolvedValue(repairOrderRecord({ repairStatus: "READY" }));

    await expect(setRepairOrderStatus(masterAuth, "order-1", { repairStatus: "READY" })).resolves.toMatchObject({
      repairStatus: "READY"
    });

    expect(repository.updateRepairOrderStatus).toHaveBeenCalledWith("org-1", "order-1", "READY");
  });

  it("blocks master from cancelling repair orders", async () => {
    await expect(setRepairOrderStatus(masterAuth, "order-1", { repairStatus: "CANCELLED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });

    expect(repository.updateRepairOrderStatus).not.toHaveBeenCalled();
  });
});
