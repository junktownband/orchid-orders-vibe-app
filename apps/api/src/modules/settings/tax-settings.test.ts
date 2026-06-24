import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
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

const audit = vi.hoisted(() => ({
  writeAuditLog: vi.fn()
}));

vi.mock("./repository.js", () => repository);
vi.mock("../audit/service.js", () => audit);

const { setTaxSettings } = await import("./service.js");

const ownerAuth: AuthContext = {
  userId: "user-1",
  membershipId: "membership-1",
  organizationId: "org-1",
  role: "OWNER",
  user: {
    id: "user-1",
    email: "sasha@orchid.local",
    name: "Саша",
    role: "OWNER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  }
};

function settingsRecord(taxMode: "NONE" | "SELF_EMPLOYED", updatedAt = "2026-06-01T10:00:00.000Z") {
  return {
    id: "settings-1",
    organizationId: "org-1",
    taxMode,
    createdAt: new Date("2026-06-01T09:00:00.000Z"),
    updatedAt: new Date(updatedAt)
  };
}

describe("tax settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes audit when tax mode changes", async () => {
    repository.getOrCreateOrganizationSettings.mockResolvedValue(settingsRecord("NONE"));
    repository.updateOrganizationTaxSettings.mockResolvedValue(
      settingsRecord("SELF_EMPLOYED", "2026-06-01T11:00:00.000Z")
    );

    await expect(setTaxSettings(ownerAuth, { taxMode: "SELF_EMPLOYED" })).resolves.toMatchObject({
      id: "settings-1",
      taxMode: "SELF_EMPLOYED"
    });

    expect(repository.updateOrganizationTaxSettings).toHaveBeenCalledWith("org-1", "SELF_EMPLOYED");
    expect(audit.writeAuditLog).toHaveBeenCalledWith(ownerAuth, {
      entityType: "OrganizationSetting",
      entityId: "settings-1",
      action: "UPDATE",
      beforeJson: expect.objectContaining({
        taxMode: "NONE"
      }),
      afterJson: expect.objectContaining({
        taxMode: "SELF_EMPLOYED"
      }),
      comment: "Tax settings updated"
    });
  });

  it("does not write audit when tax mode stays the same", async () => {
    repository.getOrCreateOrganizationSettings.mockResolvedValue(settingsRecord("SELF_EMPLOYED"));

    await expect(setTaxSettings(ownerAuth, { taxMode: "SELF_EMPLOYED" })).resolves.toMatchObject({
      taxMode: "SELF_EMPLOYED"
    });

    expect(repository.updateOrganizationTaxSettings).not.toHaveBeenCalled();
    expect(audit.writeAuditLog).not.toHaveBeenCalled();
  });
});
