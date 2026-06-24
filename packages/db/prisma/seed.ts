import bcrypt from "bcryptjs";
import {
  AuditAction,
  CommissionPayoutStatus,
  ExpenseKind,
  ExpenseStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RepairStatus,
  Role,
  ServiceType,
  TaxMode,
  TaxSubject
} from "@prisma/client";

import { productionUsers, resolveSeedPasswordForUser, type SeedMode } from "../src/seed-users.js";

const prisma = new PrismaClient();

const organizationId = "seed-org-orchid";
const organizationName = "Orchid Workshop";
const seedMode: SeedMode =
  process.argv.includes("--demo") || process.env.ORCHID_SEED_MODE === "demo" ? "demo" : "production";

const demoOrderIds = ["seed-order-finance-90001", "seed-order-active-90002"];
const demoCustomerIds = ["seed-customer-finance", "seed-customer-active"];
const demoInstrumentIds = ["seed-instrument-finance", "seed-instrument-active"];
const demoExpenseIds = [
  "seed-expense-finance-materials",
  "seed-expense-finance-tax",
  "seed-expense-finance-salary"
];

async function seedPasswordHash(password: string) {
  return bcrypt.hash(password, 10);
}

async function upsertUser(params: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: {
      email: params.email
    },
    update: {
      name: params.name,
      passwordHash: params.passwordHash,
      isActive: true
    },
    create: {
      email: params.email,
      name: params.name,
      passwordHash: params.passwordHash,
      isActive: true
    }
  });
}

async function upsertMembership(params: {
  organizationId: string;
  userId: string;
  role: Role;
  commissionPercent?: Prisma.Decimal | null;
}) {
  return prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: params.organizationId,
        userId: params.userId
      }
    },
    update: {
      role: params.role,
      commissionPercent: params.commissionPercent,
      isActive: true
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      role: params.role,
      commissionPercent: params.commissionPercent
    }
  });
}

async function seedProductionUsers(params: { organizationId: string }) {
  const seededUsers: Array<{
    email: string;
    user: Awaited<ReturnType<typeof upsertUser>>;
    membership: Awaited<ReturnType<typeof upsertMembership>>;
  }> = [];

  for (const productionUser of productionUsers) {
    const passwordHash = await seedPasswordHash(resolveSeedPasswordForUser(productionUser, process.env, seedMode));
    const user = await upsertUser({
      email: productionUser.email,
      name: productionUser.name,
      passwordHash
    });
    const membership = await upsertMembership({
      organizationId: params.organizationId,
      userId: user.id,
      role: productionUser.role,
      commissionPercent: productionUser.commissionPercent
    });

    seededUsers.push({
      email: productionUser.email,
      user,
      membership
    });
  }

  await prisma.membership.updateMany({
    where: {
      organizationId: params.organizationId,
      id: {
        notIn: seededUsers.map((item) => item.membership.id)
      }
    },
    data: {
      isActive: false
    }
  });

  return seededUsers;
}

async function seedReferenceData() {
  const services = [
    {
      id: "seed-service-full-setup",
      name: "Полная отстройка",
      defaultPriceCents: 800_000,
      defaultCostCents: 50_000
    },
    {
      id: "seed-service-shielding",
      name: "Экранировка",
      defaultPriceCents: 400_000,
      defaultCostCents: 30_000
    },
    {
      id: "seed-service-fret-polish",
      name: "Полировка ладов",
      defaultPriceCents: 600_000,
      defaultCostCents: 40_000
    }
  ];

  for (const service of services) {
    await prisma.serviceCatalogItem.upsert({
      where: {
        id: service.id
      },
      update: {
        organizationId,
        name: service.name,
        type: ServiceType.SERVICE,
        defaultPriceCents: service.defaultPriceCents,
        defaultCostCents: service.defaultCostCents,
        isActive: true
      },
      create: {
        id: service.id,
        organizationId,
        name: service.name,
        type: ServiceType.SERVICE,
        defaultPriceCents: service.defaultPriceCents,
        defaultCostCents: service.defaultCostCents,
        isActive: true
      }
    });
  }

  const categories = ["Материалы", "Аренда", "Доставка", "Инструмент", "Реклама", "Другое"];

  for (const [index, name] of categories.entries()) {
    await prisma.expenseCategory.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name
        }
      },
      update: {
        isActive: true,
        sortOrder: (index + 1) * 10
      },
      create: {
        organizationId,
        name,
        isActive: true,
        sortOrder: (index + 1) * 10
      }
    });
  }

  await prisma.expenseCategory.updateMany({
    where: {
      organizationId,
      name: {
        in: ["Налоги", "Зарплаты"]
      }
    },
    data: {
      isActive: false
    }
  });

  const paymentMethods = ["Наличные", "Перевод", "Терминал", "Другое"];

  for (const [index, name] of paymentMethods.entries()) {
    await prisma.paymentMethod.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name
        }
      },
      update: {
        isActive: true,
        sortOrder: (index + 1) * 10
      },
      create: {
        organizationId,
        name,
        isActive: true,
        sortOrder: (index + 1) * 10
      }
    });
  }

  await prisma.paymentMethod.updateMany({
    where: {
      organizationId,
      name: "Карта"
    },
    data: {
      isActive: false
    }
  });
}

async function resetDemoOrders() {
  await prisma.auditLog.deleteMany({
    where: {
      organizationId,
      entityId: {
        in: [...demoOrderIds, "seed-item-finance-setup", "seed-item-finance-shielding"]
      }
    }
  });
  await prisma.payment.deleteMany({
    where: {
      organizationId,
      repairOrderId: {
        in: demoOrderIds
      }
    }
  });
  await prisma.expense.deleteMany({
    where: {
      organizationId,
      OR: [
        {
          id: {
            in: demoExpenseIds
          }
        },
        {
          repairOrderId: {
            in: demoOrderIds
          }
        }
      ]
    }
  });
  await prisma.repairOrderItem.deleteMany({
    where: {
      organizationId,
      repairOrderId: {
        in: demoOrderIds
      }
    }
  });
  await prisma.repairOrder.deleteMany({
    where: {
      organizationId,
      OR: [
        {
          id: {
            in: demoOrderIds
          }
        },
        {
          orderNumber: {
            in: ["90001", "90002"]
          }
        }
      ]
    }
  });
  await prisma.instrument.deleteMany({
    where: {
      organizationId,
      id: {
        in: demoInstrumentIds
      }
    }
  });
  await prisma.customer.deleteMany({
    where: {
      organizationId,
      id: {
        in: demoCustomerIds
      }
    }
  });
}

async function seedDemoOrders(params: {
  ownerUserId: string;
  masterOneMembershipId: string;
  masterOneName: string;
  masterTwoMembershipId: string;
}) {
  const acceptedAt = new Date("2026-06-01T08:00:00.000Z");
  const issuedAt = new Date("2026-06-03T14:00:00.000Z");
  const commissionPaidAt = new Date("2026-06-04T09:00:00.000Z");
  const materialsCategory = await prisma.expenseCategory.findUniqueOrThrow({
    where: {
      organizationId_name: {
        organizationId,
        name: "Материалы"
      }
    }
  });
  const cashPaymentMethod = await prisma.paymentMethod.findUniqueOrThrow({
    where: {
      organizationId_name: {
        organizationId,
        name: "Наличные"
      }
    }
  });

  const customer = await prisma.customer.create({
    data: {
      id: "seed-customer-finance",
      organizationId,
      name: "Иван Петров",
      phone: "+7 (900) 111-22-33",
      phoneNormalized: "79001112233",
      email: "ivan@example.test",
      note: "Демо-клиент для финансового сценария"
    }
  });
  const instrument = await prisma.instrument.create({
    data: {
      id: "seed-instrument-finance",
      organizationId,
      customerId: customer.id,
      type: "guitar",
      brand: "Fender",
      model: "Stratocaster",
      note: "Нужна отстройка и экранировка"
    }
  });

  await prisma.repairOrder.create({
    data: {
      id: "seed-order-finance-90001",
      organizationId,
      orderNumber: "90001",
      customerId: customer.id,
      instrumentId: instrument.id,
      assignedMasterMembershipId: params.masterOneMembershipId,
      title: "Fender Stratocaster",
      description: "Демо: две услуги, два мастера, налог, расходник и выплата комиссии",
      totalAmountCents: 1_200_000,
      totalCostCents: 80_000,
      grossProfitCents: 1_120_000,
      actualCommissionCents: 327_000,
      repairStatus: RepairStatus.ISSUED,
      paymentStatus: PaymentStatus.PAID,
      paidAt: issuedAt,
      paidByUserId: params.ownerUserId,
      acceptedAt,
      completedAt: issuedAt,
      issuedAt,
      taxModeSnapshot: TaxMode.SELF_EMPLOYED,
      taxSubject: TaxSubject.INDIVIDUAL,
      taxRateBps: 400,
      taxAmountCents: 48_000,
      lineItems: {
        create: [
          {
            id: "seed-item-finance-setup",
            organizationId,
            serviceCatalogItemId: "seed-service-full-setup",
            assignedMasterMembershipId: params.masterOneMembershipId,
            nameSnapshot: "Полная отстройка",
            type: ServiceType.SERVICE,
            priceCents: 800_000,
            costCents: 50_000,
            commissionPercentSnapshot: new Prisma.Decimal("0.3000"),
            commissionBaseCents: 618_000,
            commissionAmountCents: 185_400,
            commissionCalculatedAt: issuedAt,
            commissionPayoutStatus: CommissionPayoutStatus.PAID,
            commissionPaidAt,
            commissionPaidByUserId: params.ownerUserId
          },
          {
            id: "seed-item-finance-shielding",
            organizationId,
            serviceCatalogItemId: "seed-service-shielding",
            assignedMasterMembershipId: params.masterTwoMembershipId,
            nameSnapshot: "Экранировка",
            type: ServiceType.SERVICE,
            priceCents: 400_000,
            costCents: 30_000,
            commissionPercentSnapshot: new Prisma.Decimal("0.4000"),
            commissionBaseCents: 354_000,
            commissionAmountCents: 141_600,
            commissionCalculatedAt: issuedAt,
            commissionPayoutStatus: CommissionPayoutStatus.UNPAID
          }
        ]
      }
    }
  });

  await prisma.expense.createMany({
    data: [
      {
        id: "seed-expense-finance-materials",
        organizationId,
        categoryId: materialsCategory.id,
        paymentMethodId: cashPaymentMethod.id,
        createdByUserId: params.ownerUserId,
        repairOrderId: "seed-order-finance-90001",
        repairOrderItemId: "seed-item-finance-setup",
        amountCents: 100_000,
        spentAt: new Date("2026-06-02T10:00:00.000Z"),
        spentByName: "Owner",
        description: "Расходники для полной отстройки",
        kind: ExpenseKind.REGULAR,
        status: ExpenseStatus.CONFIRMED,
        confirmedAt: new Date("2026-06-02T10:00:00.000Z")
      },
      {
        id: "seed-expense-finance-tax",
        organizationId,
        createdByUserId: params.ownerUserId,
        repairOrderId: "seed-order-finance-90001",
        amountCents: 48_000,
        spentAt: issuedAt,
        spentByName: "Owner",
        description: "Налог по заказу № 90001",
        kind: ExpenseKind.TAX,
        status: ExpenseStatus.CONFIRMED,
        confirmedAt: issuedAt,
        comment: "Самозанятость 4.00%"
      },
      {
        id: "seed-expense-finance-salary",
        organizationId,
        createdByUserId: params.ownerUserId,
        repairOrderId: "seed-order-finance-90001",
        repairOrderItemId: "seed-item-finance-setup",
        amountCents: 185_400,
        spentAt: commissionPaidAt,
        spentByName: params.masterOneName,
        description: "Выплата мастеру по заказу № 90001",
        kind: ExpenseKind.SALARY,
        status: ExpenseStatus.CONFIRMED,
        confirmedAt: commissionPaidAt,
        comment: "Комиссия за услугу: Полная отстройка"
      }
    ]
  });

  await prisma.payment.create({
    data: {
      organizationId,
      repairOrderId: "seed-order-finance-90001",
      acceptedByUserId: params.ownerUserId,
      paymentMethodId: cashPaymentMethod.id,
      amountCents: 1_200_000,
      paidAt: issuedAt,
      comment: "Полная оплата при выдаче демо-заказа"
    }
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: params.ownerUserId,
      entityType: "RepairOrder",
      entityId: "seed-order-finance-90001",
      action: AuditAction.ISSUE,
      afterJson: {
        repairStatus: RepairStatus.ISSUED,
        paymentStatus: PaymentStatus.PAID,
        taxAmountCents: 48_000
      },
      comment: "Seed demo order issued"
    }
  });

  const activeCustomer = await prisma.customer.create({
    data: {
      id: "seed-customer-active",
      organizationId,
      name: "Мария Соколова",
      phone: "+7 (900) 222-33-44",
      phoneNormalized: "79002223344"
    }
  });
  const activeInstrument = await prisma.instrument.create({
    data: {
      id: "seed-instrument-active",
      organizationId,
      customerId: activeCustomer.id,
      type: "guitar",
      brand: "Gibson",
      model: "Les Paul"
    }
  });

  await prisma.repairOrder.create({
    data: {
      id: "seed-order-active-90002",
      organizationId,
      orderNumber: "90002",
      customerId: activeCustomer.id,
      instrumentId: activeInstrument.id,
      assignedMasterMembershipId: params.masterOneMembershipId,
      title: "Gibson Les Paul",
      description: "Демо: активный заказ для мастера",
      totalAmountCents: 600_000,
      totalCostCents: 0,
      grossProfitCents: 600_000,
      repairStatus: RepairStatus.IN_PROGRESS,
      paymentStatus: PaymentStatus.UNPAID,
      acceptedAt: new Date("2026-06-05T08:00:00.000Z"),
      lineItems: {
        create: [
          {
            id: "seed-item-active-fret-polish",
            organizationId,
            serviceCatalogItemId: "seed-service-fret-polish",
            assignedMasterMembershipId: params.masterOneMembershipId,
            nameSnapshot: "Полировка ладов",
            type: ServiceType.SERVICE,
            priceCents: 600_000,
            costCents: 0
          }
        ]
      }
    }
  });
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: {
      id: organizationId
    },
    update: {
      name: organizationName,
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    },
    create: {
      id: organizationId,
      name: organizationName,
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  });

  const seededUsers = await seedProductionUsers({
    organizationId: organization.id
  });

  await prisma.organizationSetting.upsert({
    where: {
      organizationId: organization.id
    },
    update: {
      taxMode: seedMode === "demo" ? TaxMode.SELF_EMPLOYED : TaxMode.NONE
    },
    create: {
      organizationId: organization.id,
      taxMode: seedMode === "demo" ? TaxMode.SELF_EMPLOYED : TaxMode.NONE
    }
  });

  await seedReferenceData();
  await resetDemoOrders();

  if (seedMode === "demo") {
    const owner = seededUsers.find((item) => item.email === "sasha@orchid.local");
    const master = seededUsers.find((item) => item.email === "dima@orchid.local");

    if (!owner || !master) {
      throw new Error("Demo seed requires Sasha owner and Dima master users.");
    }

    await seedDemoOrders({
      ownerUserId: owner.user.id,
      masterOneMembershipId: master.membership.id,
      masterOneName: master.user.name,
      masterTwoMembershipId: master.membership.id
    });
  }

  console.info(
    seedMode === "demo"
      ? "Seeded Orchid Workshop production users, settings, services, and demo financial orders."
      : "Seeded Orchid Workshop production users, basic settings, and reference data."
  );
}

await main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
