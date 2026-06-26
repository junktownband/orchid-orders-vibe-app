export const authResponse = {
  accessToken: "access-token",
  user: {
    id: "user-1",
    email: "sasha@orchid.local",
    name: "Саша",
    role: "OWNER",
    organization: {
      id: "org-1",
      name: "Orchid Workshop",
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  }
};

export const repairOrdersResponse = {
  items: [
    {
      id: "repair-1",
      orderNumber: "00001",
      title: "Stratocaster",
      description: "Отстройка",
      totalAmountCents: 2000000,
      totalCostCents: 60000,
      grossProfitCents: 1940000,
      repairStatus: "ACCEPTED",
      paymentStatus: "UNPAID",
      paidAmountCents: 0,
      balanceDueCents: 2000000,
      paidAt: null,
      issuedAt: null,
      taxModeSnapshot: null,
      taxSubject: null,
      taxRateBps: null,
      taxAmountCents: null,
      paidByName: null,
      assignedMasterMembershipId: "member-1",
      assignedMasterName: "Owner",
      customerId: "customer-1",
      customerName: "Иван",
      customerPhone: "+7 (999) 123-45-67",
      customerEmail: "ivan@example.test",
      customerNote: "Постоянный клиент",
      instrumentName: "Fender Stratocaster",
      items: [
        {
          id: "item-1",
          serviceCatalogItemId: null,
          assignedMasterMembershipId: "member-1",
          assignedMasterName: "Owner",
          name: "Отстройка",
          type: "SERVICE",
          priceCents: 1800000,
          costCents: 60000,
          commissionPercentSnapshot: null,
          commissionBaseCents: null,
          commissionAmountCents: null,
          commissionCalculatedAt: null,
          commissionPayoutStatus: "UNPAID",
          commissionPaidAt: null,
          commissionPaidByName: null
        },
        {
          id: "item-2",
          serviceCatalogItemId: null,
          assignedMasterMembershipId: null,
          assignedMasterName: null,
          name: "Комплект колков",
          type: "PART",
          priceCents: 200000,
          costCents: 0,
          commissionPercentSnapshot: null,
          commissionBaseCents: null,
          commissionAmountCents: null,
          commissionCalculatedAt: null,
          commissionPayoutStatus: "UNPAID",
          commissionPaidAt: null,
          commissionPaidByName: null
        }
      ],
      payments: [],
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    }
  ],
  nextCursor: null,
  hasMore: false
};

export const paidRepairOrder = {
  ...repairOrdersResponse.items[0],
  paymentStatus: "PAID",
  paidAmountCents: 2000000,
  balanceDueCents: 0,
  paidAt: "2026-05-29T09:00:00.000Z",
  issuedAt: null,
  paidByName: "Owner",
  payments: [
    {
      id: "payment-1",
      amountCents: 2000000,
      paidAt: "2026-05-29T09:00:00.000Z",
      paymentMethodId: "payment-method-1",
      paymentMethodName: "Наличные",
      acceptedByName: "Owner",
      comment: null
    }
  ]
};

export const updatedCustomerResponse = {
  id: "customer-1",
  name: "Петр",
  phone: "+7 (999) 123-45-67",
  email: "ivan@example.test",
  note: "Постоянный клиент",
  updatedAt: "2026-05-29T11:00:00.000Z"
};

export const mastersResponse = {
  items: [{ id: "member-1", name: "Owner", role: "OWNER" }]
};

export const serviceCatalogResponse = {
  items: [
    {
      id: "service-1",
      name: "Полная проточка ладов",
      type: "SERVICE",
      defaultPriceCents: 600000,
      defaultCostCents: 50000,
      isActive: true
    }
  ]
};

export const expensesResponse = {
  items: [],
  authors: []
};

export const financeOverviewResponse = {
  period: {
    from: "2026-06-01T00:00:00.000Z",
    to: "2026-06-30T23:59:59.999Z"
  },
  account: {
    balanceCents: 1_250_000,
    availableAfterObligationsCents: 1_050_000,
    cashGapRiskCents: 0
  },
  summary: {
    paidRevenueCents: 900_000,
    paidCostCents: 240_000,
    grossProfitCents: 660_000,
    confirmedExpensesCents: 120_000,
    paidCommissionsCents: 80_000,
    payableCommissionsCents: 200_000,
    manualInflowCents: 50_000,
    manualOutflowCents: 20_000,
    netMovementCents: 730_000,
    repairOrdersCount: 7,
    paidOrdersCount: 5,
    unpaidOrdersCount: 2,
    partiallyPaidOrdersCount: 1,
    receivablesCents: 220_000,
    averagePaidTicketCents: 180_000
  },
  analytics: {
    serviceMix: {
      standard: {
        count: 6,
        revenueCents: 620_000,
        grossProfitCents: 450_000
      },
      custom: {
        count: 3,
        revenueCents: 280_000,
        grossProfitCents: 210_000
      }
    },
    masterWorks: [
      {
        masterMembershipId: "member-1",
        masterName: "Owner",
        servicesCount: 5,
        standardServicesCount: 4,
        customServicesCount: 1,
        revenueCents: 500_000,
        grossProfitCents: 360_000,
        commissionCents: 120_000
      },
      {
        masterMembershipId: "member-2",
        masterName: "Master 1",
        servicesCount: 4,
        standardServicesCount: 2,
        customServicesCount: 2,
        revenueCents: 400_000,
        grossProfitCents: 300_000,
        commissionCents: 110_000
      }
    ],
    paymentMethods: [
      {
        key: "payment-method-1",
        label: "Наличные",
        inflowCents: 520_000,
        outflowCents: 80_000,
        netCents: 440_000,
        count: 6
      },
      {
        key: "payment-method-2",
        label: "Перевод",
        inflowCents: 380_000,
        outflowCents: 40_000,
        netCents: 340_000,
        count: 3
      }
    ],
    expensesByCategory: [
      {
        key: "materials",
        label: "Материалы",
        amountCents: 80_000,
        count: 3
      },
      {
        key: "rent",
        label: "Аренда",
        amountCents: 40_000,
        count: 1
      }
    ],
    expensesByCreator: [
      {
        key: "user-1",
        label: "Саша",
        amountCents: 120_000,
        count: 4
      }
    ]
  },
  masterCommissions: [
    {
      masterMembershipId: "member-2",
      masterName: "Master 1",
      accruedCents: 200_000,
      paidCents: 80_000,
      payableCents: 120_000,
      accruedItemsCount: 4,
      paidItemsCount: 1,
      payableItemsCount: 3
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
      totalAmountCents: 300_000,
      paidAmountCents: 80_000,
      balanceDueCents: 220_000,
      createdAt: "2026-06-12T10:00:00.000Z",
      updatedAt: "2026-06-18T12:00:00.000Z"
    }
  ],
  operations: [
    {
      id: "payment-1",
      source: "PAYMENT",
      type: "PAYMENT_RECEIVED",
      direction: "IN",
      amountCents: 300_000,
      signedAmountCents: 300_000,
      occurredAt: "2026-06-10T10:00:00.000Z",
      description: "Оплата заказа № 00001",
      paymentMethodId: "payment-method-1",
      paymentMethodName: "Наличные",
      counterpartyName: "Петр",
      repairOrderId: "repair-1",
      repairOrderNumber: "00001",
      createdByName: "Саша",
      comment: null
    }
  ]
};

export const paymentMethodsResponse = {
  items: [
    {
      id: "payment-method-1",
      name: "Наличные",
      isActive: true,
      sortOrder: 10,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    },
    {
      id: "payment-method-2",
      name: "Перевод",
      isActive: true,
      sortOrder: 20,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    }
  ]
};

export const expenseCategoriesResponse = {
  items: [
    {
      id: "expense-category-1",
      name: "Материалы",
      color: "#7dd3fc",
      isActive: true,
      sortOrder: 10,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    }
  ]
};

export const commissionsResponse = {
  items: [],
  totals: {
    accruedCents: 0,
    paidCents: 0,
    unpaidCents: 0
  }
};

export const commissionsWithUnpaidResponse = {
  items: [
    {
      id: "item-1",
      repairOrderId: "repair-1",
      repairOrderNumber: "00001",
      repairOrderItemId: "item-1",
      repairOrderItemName: "Отстройка",
      masterMembershipId: "member-2",
      masterName: "Master 1",
      customerName: "Петр",
      commissionBaseCents: 100_000,
      commissionAmountCents: 30_000,
      commissionPercentSnapshot: 0.3,
      commissionCalculatedAt: "2026-06-15T10:00:00.000Z",
      commissionPayoutStatus: "UNPAID",
      commissionPaidAt: null,
      commissionPaidByName: null,
      issuedAt: "2026-06-15T09:00:00.000Z"
    }
  ],
  totals: {
    accruedCents: 30_000,
    paidCents: 0,
    unpaidCents: 30_000
  }
};

export const auditLogResponse = {
  items: [
    {
      id: "audit-1",
      entityType: "RepairOrder",
      entityId: "repair-1",
      action: "STATUS_CHANGE",
      userName: "Owner",
      beforeJson: null,
      afterJson: {
        repairStatus: "READY"
      },
      comment: "Repair order status changed to READY",
      createdAt: "2026-05-29T10:00:00.000Z"
    }
  ]
};

export const repairOrderAuditResponse = {
  items: [
    {
      id: "audit-order-1",
      entityType: "RepairOrder",
      entityId: "repair-1",
      action: "STATUS_CHANGE",
      userName: "Owner",
      beforeJson: null,
      afterJson: {
        repairStatus: "READY"
      },
      comment: "Repair order status changed to READY",
      createdAt: "2026-05-29T10:00:00.000Z"
    }
  ]
};

export const membersResponse = {
  items: [
    {
      id: "member-manager",
      userId: "user-manager",
      name: "Manager 1",
      email: "manager@orchid.local",
      phone: "+7 (900) 000-00-03",
      role: "MANAGER",
      commissionPercent: null,
      isActive: true,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    },
    {
      id: "member-2",
      userId: "user-2",
      name: "Master 1",
      email: "alex.master@orchid.local",
      phone: "+7 (900) 000-00-02",
      role: "MASTER",
      commissionPercent: 30,
      isActive: true,
      createdAt: "2026-05-29T08:00:00.000Z",
      updatedAt: "2026-05-29T08:00:00.000Z"
    }
  ]
};

export const dashboardResponse = {
  period: {
    from: "2026-05-01T00:00:00.000Z",
    to: "2026-05-31T23:59:59.999Z"
  },
  kpis: {
    paidRevenueCents: 1234500,
    paidCostCents: 234500,
    grossProfitCents: 1000000,
    accruedRevenueCents: 1234500,
    confirmedExpensesCents: 0,
    accruedCommissionsCents: 0,
    paidCommissionsCents: 0,
    payableCommissionsCents: 0,
    netCashCents: 1234500,
    repairOrdersCount: 1,
    paidOrdersCount: 1,
    unpaidOrdersCount: 0,
    averagePaidTicketCents: 1234500
  },
  resale: {
    revenueCents: 200000,
    costCents: 0,
    grossProfitCents: 200000,
    marginPercent: 100
  },
  repairsByStatus: [{ status: "ACCEPTED", count: 1 }]
};

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}
