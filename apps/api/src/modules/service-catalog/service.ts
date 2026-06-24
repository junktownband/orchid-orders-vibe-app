import {
  apiErrorCodes,
  type CreateServiceCatalogItemInput,
  type ServiceCatalogItemResponse,
  type ServiceCatalogListResponse,
  type UpdateServiceCatalogItemInput
} from "@orchid/shared";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import {
  createServiceCatalogItem,
  findServiceCatalogItem,
  listServiceCatalogItems,
  updateServiceCatalogItem
} from "./repository.js";

type ServiceCatalogRecord = Awaited<ReturnType<typeof listServiceCatalogItems>>[number];

function assertCanManageCatalog(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(item: ServiceCatalogRecord): ServiceCatalogItemResponse {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    defaultPriceCents: item.defaultPriceCents,
    defaultCostCents: item.defaultCostCents,
    isActive: item.isActive
  };
}

function toAuditSnapshot(item: ServiceCatalogRecord) {
  return {
    name: item.name,
    type: item.type,
    defaultPriceCents: item.defaultPriceCents,
    defaultCostCents: item.defaultCostCents,
    isActive: item.isActive
  };
}

export async function getServiceCatalog(auth: AuthContext): Promise<ServiceCatalogListResponse> {
  assertCanManageCatalog(auth);

  const items = await listServiceCatalogItems(auth.organizationId);

  return {
    items: items.map(toResponse)
  };
}

export async function editServiceCatalogItem(
  auth: AuthContext,
  id: string,
  input: UpdateServiceCatalogItemInput
): Promise<ServiceCatalogItemResponse> {
  assertCanManageCatalog(auth);

  const existing = await findServiceCatalogItem(auth.organizationId, id);

  if (!existing) {
    throw new AuthError(apiErrorCodes.notFound, "Service catalog item not found", 404);
  }

  try {
    const item = await updateServiceCatalogItem(auth.organizationId, id, {
      name: input.name?.trim(),
      defaultPriceCents: input.defaultPriceCents,
      defaultCostCents: input.defaultCostCents,
      isActive: input.isActive
    });
    const action = input.isActive === false ? "DELETE" : "UPDATE";

    await writeAuditLog(auth, {
      entityType: "ServiceCatalogItem",
      entityId: item.id,
      action,
      beforeJson: toAuditSnapshot(existing),
      afterJson: toAuditSnapshot(item),
      comment: action === "DELETE" ? "Service catalog item disabled" : "Service catalog item updated"
    });

    return toResponse(item);
  } catch {
    throw new AuthError(apiErrorCodes.conflict, "Service catalog item update failed", 409);
  }
}

export async function addServiceCatalogItem(
  auth: AuthContext,
  input: CreateServiceCatalogItemInput
): Promise<ServiceCatalogItemResponse> {
  assertCanManageCatalog(auth);

  try {
    const item = await createServiceCatalogItem(auth.organizationId, {
      name: input.name.trim(),
      type: input.type,
      defaultPriceCents: input.defaultPriceCents,
      defaultCostCents: input.defaultCostCents
    });

    await writeAuditLog(auth, {
      entityType: "ServiceCatalogItem",
      entityId: item.id,
      action: "CREATE",
      afterJson: {
        name: item.name,
        type: item.type,
        defaultPriceCents: item.defaultPriceCents,
        defaultCostCents: item.defaultCostCents,
        isActive: item.isActive
      },
      comment: "Service catalog item created"
    });

    return toResponse(item);
  } catch {
    throw new AuthError(apiErrorCodes.conflict, "Service catalog item already exists", 409);
  }
}
