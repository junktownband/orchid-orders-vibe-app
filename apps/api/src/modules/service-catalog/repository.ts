import { prisma, type ServiceType } from "@orchid/db";

export async function listServiceCatalogItems(organizationId: string) {
  return prisma.serviceCatalogItem.findMany({
    where: {
      organizationId,
      deletedAt: null,
      type: "SERVICE"
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function createServiceCatalogItem(
  organizationId: string,
  data: {
    name: string;
    type: ServiceType;
    defaultPriceCents: number;
    defaultCostCents: number;
  }
) {
  return prisma.serviceCatalogItem.create({
    data: {
      organizationId,
      name: data.name,
      type: data.type,
      defaultPriceCents: data.defaultPriceCents,
      defaultCostCents: data.defaultCostCents
    }
  });
}

export async function findServiceCatalogItem(organizationId: string, id: string) {
  return prisma.serviceCatalogItem.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null
    }
  });
}

export async function updateServiceCatalogItem(
  organizationId: string,
  id: string,
  data: {
    name?: string;
    defaultPriceCents?: number;
    defaultCostCents?: number;
    isActive?: boolean;
  }
) {
  return prisma.serviceCatalogItem.update({
    where: {
      id,
      organizationId,
      deletedAt: null
    },
    data
  });
}
