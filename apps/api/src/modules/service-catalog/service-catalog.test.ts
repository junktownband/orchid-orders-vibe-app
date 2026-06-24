import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  createServiceCatalogItem: vi.fn(),
  findServiceCatalogItem: vi.fn(),
  listServiceCatalogItems: vi.fn(),
  updateServiceCatalogItem: vi.fn()
}));

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../audit/service.js", () => audit);

const { editServiceCatalogItem } = await import("./service.js");

const auth: AuthContext = {
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

function serviceCatalogRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "service-1",
    organizationId: "org-1",
    name: "Полная проточка ладов",
    type: "SERVICE",
    defaultPriceCents: 600_000,
    defaultCostCents: 50_000,
    isActive: true,
    sortOrder: 100,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    deletedAt: null,
    ...overrides
  };
}

describe("service catalog service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes audit when a service catalog item is updated", async () => {
    const before = serviceCatalogRecord();
    const after = serviceCatalogRecord({
      name: "Полная обработка ладов",
      defaultPriceCents: 650_000,
      updatedAt: new Date("2026-06-01T11:00:00.000Z")
    });

    repository.findServiceCatalogItem.mockResolvedValue(before);
    repository.updateServiceCatalogItem.mockResolvedValue(after);

    await expect(
      editServiceCatalogItem(auth, "service-1", {
        name: "Полная обработка ладов",
        defaultPriceCents: 650_000
      })
    ).resolves.toMatchObject({
      id: "service-1",
      name: "Полная обработка ладов",
      defaultPriceCents: 650_000
    });

    expect(repository.updateServiceCatalogItem).toHaveBeenCalledWith("org-1", "service-1", {
      name: "Полная обработка ладов",
      defaultPriceCents: 650_000,
      defaultCostCents: undefined,
      isActive: undefined
    });
    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "ServiceCatalogItem",
      entityId: "service-1",
      action: "UPDATE",
      beforeJson: expect.objectContaining({
        name: "Полная проточка ладов"
      }),
      afterJson: expect.objectContaining({
        name: "Полная обработка ладов"
      }),
      comment: "Service catalog item updated"
    });
  });

  it("writes delete audit action when a service catalog item is disabled", async () => {
    const before = serviceCatalogRecord();
    const after = serviceCatalogRecord({
      isActive: false,
      updatedAt: new Date("2026-06-01T11:00:00.000Z")
    });

    repository.findServiceCatalogItem.mockResolvedValue(before);
    repository.updateServiceCatalogItem.mockResolvedValue(after);

    await expect(
      editServiceCatalogItem(auth, "service-1", {
        isActive: false
      })
    ).resolves.toMatchObject({
      id: "service-1",
      isActive: false
    });

    expect(audit.writeAuditLog).toHaveBeenCalledWith(auth, {
      entityType: "ServiceCatalogItem",
      entityId: "service-1",
      action: "DELETE",
      beforeJson: expect.objectContaining({
        isActive: true
      }),
      afterJson: expect.objectContaining({
        isActive: false
      }),
      comment: "Service catalog item disabled"
    });
  });
});
