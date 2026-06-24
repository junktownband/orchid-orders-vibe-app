import { prisma } from "@orchid/db";

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export async function findCustomer(organizationId: string, id: string) {
  return prisma.customer.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null
    }
  });
}

export async function updateCustomerProfile(
  organizationId: string,
  id: string,
  data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    note?: string | null;
  }
) {
  return prisma.customer.update({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    data: {
      name: data.name,
      phone: data.phone,
      phoneNormalized: data.phone === undefined ? undefined : data.phone ? normalizePhoneDigits(data.phone) : null,
      email: data.email,
      note: data.note
    }
  });
}
