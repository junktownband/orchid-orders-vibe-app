import { prisma, Role, TaxMode, type Prisma } from "@orchid/db";

export async function getOrCreateOrganizationSettings(organizationId: string) {
  return prisma.organizationSetting.upsert({
    where: {
      organizationId
    },
    update: {},
    create: {
      organizationId
    }
  });
}

export async function updateOrganizationTaxSettings(organizationId: string, taxMode: TaxMode) {
  return prisma.organizationSetting.upsert({
    where: {
      organizationId
    },
    update: {
      taxMode
    },
    create: {
      organizationId,
      taxMode
    }
  });
}

export async function listPaymentMethods(organizationId: string, activeOnly = false) {
  return prisma.paymentMethod.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {})
    },
    orderBy: [
      {
        sortOrder: "asc"
      },
      {
        name: "asc"
      }
    ]
  });
}

export async function createPaymentMethod(data: {
  organizationId: string;
  name: string;
  sortOrder?: number;
}) {
  return prisma.paymentMethod.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      sortOrder: data.sortOrder ?? 100
    }
  });
}

export async function updatePaymentMethod(data: {
  organizationId: string;
  id: string;
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.paymentMethod.update({
    where: {
      id: data.id,
      organizationId: data.organizationId
    },
    data: {
      name: data.name,
      isActive: data.isActive,
      sortOrder: data.sortOrder
    }
  });
}

export async function findActivePaymentMethod(organizationId: string, id: string) {
  return prisma.paymentMethod.findFirst({
    where: {
      id,
      organizationId,
      isActive: true
    }
  });
}

export async function listExpenseCategories(organizationId: string, activeOnly = false) {
  return prisma.expenseCategory.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {})
    },
    orderBy: [
      {
        sortOrder: "asc"
      },
      {
        name: "asc"
      }
    ]
  });
}

export async function createExpenseCategory(data: {
  organizationId: string;
  name: string;
  color?: string | null;
  sortOrder?: number;
}) {
  return prisma.expenseCategory.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      color: data.color ?? null,
      sortOrder: data.sortOrder ?? 100
    }
  });
}

export async function updateExpenseCategory(data: {
  organizationId: string;
  id: string;
  name?: string;
  color?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}) {
  return prisma.expenseCategory.update({
    where: {
      id: data.id,
      organizationId: data.organizationId
    },
    data: {
      name: data.name,
      color: data.color,
      isActive: data.isActive,
      sortOrder: data.sortOrder
    }
  });
}

export async function findActiveExpenseCategory(organizationId: string, id: string) {
  return prisma.expenseCategory.findFirst({
    where: {
      id,
      organizationId,
      isActive: true
    }
  });
}

const memberInclude = {
  user: true
} satisfies Prisma.MembershipInclude;

export async function listMasterMembers(organizationId: string, roles: Role[] = [Role.MASTER]) {
  return prisma.membership.findMany({
    where: {
      organizationId,
      role: {
        in: roles
      },
      user: {
        isActive: true
      }
    },
    include: memberInclude,
    orderBy: [
      {
        isActive: "desc"
      },
      {
        user: {
          name: "asc"
        }
      }
    ]
  });
}

export async function findUserWithOrganizationMembership(email: string, organizationId: string) {
  return prisma.user.findUnique({
    where: {
      email
    },
    include: {
      memberships: {
        where: {
          organizationId
        },
        include: {
          user: true
        },
        take: 1
      }
    }
  });
}

export async function createMasterMember(data: {
  organizationId: string;
  email: string;
  name: string;
  phone?: string | null;
  passwordHash: string;
  commissionPercent?: Prisma.Decimal | null;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone ?? null,
        passwordHash: data.passwordHash,
        isActive: true
      }
    });

    return tx.membership.create({
      data: {
        organizationId: data.organizationId,
        userId: user.id,
        role: Role.MASTER,
        commissionPercent: data.commissionPercent ?? null,
        isActive: true
      },
      include: memberInclude
    });
  });
}

export async function reactivateMasterMember(data: {
  membershipId: string;
  name: string;
  phone?: string | null;
  commissionPercent?: Prisma.Decimal | null;
}) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUniqueOrThrow({
      where: {
        id: data.membershipId
      }
    });

    await tx.user.update({
      where: {
        id: membership.userId
      },
      data: {
        name: data.name,
        phone: data.phone ?? null,
        isActive: true
      }
    });

    return tx.membership.update({
      where: {
        id: data.membershipId
      },
      data: {
        role: Role.MASTER,
        commissionPercent: data.commissionPercent ?? null,
        isActive: true
      },
      include: memberInclude
    });
  });
}

export async function findMemberById(organizationId: string, id: string) {
  return prisma.membership.findFirst({
    where: {
      id,
      organizationId
    },
    include: memberInclude
  });
}

export async function updateMasterMember(data: {
  organizationId: string;
  membershipId: string;
  name?: string;
  email?: string;
  phone?: string | null;
  commissionPercent?: Prisma.Decimal | null;
  isActive?: boolean;
  manageableRoles?: Role[];
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findFirstOrThrow({
      where: {
        id: data.membershipId,
        organizationId: data.organizationId,
        role: {
          in: data.manageableRoles ?? [Role.MASTER]
        }
      },
      include: {
        user: true
      }
    });

    await tx.user.update({
      where: {
        id: existing.userId
      },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        isActive: data.isActive === true ? true : undefined
      }
    });

    return tx.membership.update({
      where: {
        id: data.membershipId
      },
      data: {
        commissionPercent: data.commissionPercent,
        isActive: data.isActive
      },
      include: memberInclude
    });
  });
}
