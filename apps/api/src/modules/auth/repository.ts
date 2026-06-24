import { prisma } from "@orchid/db";

export async function findUserForLogin(email: string) {
  return prisma.user.findUnique({
    where: {
      email
    },
    include: {
      memberships: {
        where: {
          isActive: true
        },
        include: {
          organization: true
        },
        take: 1
      }
    }
  });
}

export async function findMembershipContext(userId: string, membershipId?: string) {
  return prisma.membership.findFirst({
    where: {
      id: membershipId,
      userId,
      isActive: true,
      user: {
        isActive: true
      }
    },
    include: {
      organization: true,
      user: true
    }
  });
}
