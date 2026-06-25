import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@orchid/db";

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

const { addMember, editMember, getMembers } = await import("./service.js");

const ownerAuth: AuthContext = {
  userId: "owner-user",
  membershipId: "owner-membership",
  organizationId: "org-1",
  role: "OWNER",
  user: {
    id: "owner-user",
    email: "owner@orchid.local",
    name: "Owner",
    role: "OWNER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "Asia/Yekaterinburg"
    }
  }
};

const adminAuth: AuthContext = {
  userId: "admin-user",
  membershipId: "admin-membership",
  organizationId: "org-1",
  role: "ADMIN",
  user: {
    id: "admin-user",
    email: "admin@orchid.local",
    name: "Admin",
    role: "ADMIN",
    organization: ownerAuth.user.organization
  }
};

function memberRecord(role: Role, overrides: Record<string, unknown> = {}) {
  const suffix = role.toLowerCase();

  return {
    id: `${suffix}-membership`,
    organizationId: "org-1",
    userId: `${suffix}-user`,
    role,
    commissionPercent: role === Role.MASTER ? 0.3 : null,
    isActive: true,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    user: {
      id: `${suffix}-user`,
      email: `${suffix}@orchid.local`,
      name: role,
      phone: null,
      passwordHash: "hash",
      isActive: true,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      updatedAt: new Date("2026-06-01T10:00:00.000Z")
    },
    ...overrides
  };
}

describe("member settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets owner list every active organization member from the members screen", async () => {
    repository.listMasterMembers.mockResolvedValue([
      memberRecord(Role.OWNER),
      memberRecord(Role.ADMIN),
      memberRecord(Role.MANAGER),
      memberRecord(Role.MASTER)
    ]);

    await expect(getMembers(ownerAuth)).resolves.toMatchObject({
      items: [
        { role: "OWNER" },
        { role: "ADMIN" },
        { role: "MANAGER" },
        { role: "MASTER" }
      ]
    });

    expect(repository.listMasterMembers).toHaveBeenCalledWith("org-1", [
      Role.OWNER,
      Role.ADMIN,
      Role.MANAGER,
      Role.MASTER
    ]);
  });

  it("lets admin list operational members from the members screen", async () => {
    repository.listMasterMembers.mockResolvedValue([memberRecord(Role.MANAGER), memberRecord(Role.MASTER)]);

    await expect(getMembers(adminAuth)).resolves.toMatchObject({
      items: [{ role: "MANAGER" }, { role: "MASTER" }]
    });

    expect(repository.listMasterMembers).toHaveBeenCalledWith("org-1", [Role.MANAGER, Role.MASTER]);
  });

  it("lets owner update a non-master member", async () => {
    const existingAdmin = memberRecord(Role.ADMIN, {
      id: "admin-membership",
      userId: "admin-user"
    });
    const updatedAdmin = memberRecord(Role.ADMIN, {
      id: "admin-membership",
      userId: "admin-user",
      user: {
        ...existingAdmin.user,
        name: "Updated Admin"
      }
    });

    repository.findMemberById.mockResolvedValue(existingAdmin);
    repository.updateMasterMember.mockResolvedValue(updatedAdmin);

    await expect(
      editMember(ownerAuth, "admin-membership", {
        name: "Updated Admin",
        email: "admin@orchid.local",
        commissionPercent: 60
      })
    ).resolves.toMatchObject({
      id: "admin-membership",
      name: "Updated Admin",
      role: "ADMIN"
    });

    expect(repository.updateMasterMember).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionPercent: expect.objectContaining({}),
        membershipId: "admin-membership",
        manageableRoles: [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.MASTER]
      })
    );
  });

  it("defaults newly created workshop members to 60 percent commission", async () => {
    const createdMaster = memberRecord(Role.MASTER, {
      commissionPercent: 0.6
    });

    repository.findUserWithOrganizationMembership.mockResolvedValue(null);
    repository.createMasterMember.mockResolvedValue(createdMaster);
    audit.writeAuditLog.mockResolvedValue(undefined);

    await expect(
      addMember(ownerAuth, {
        name: "New Master",
        email: "new-master@orchid.local",
        phone: undefined
      })
    ).resolves.toMatchObject({
      commissionPercent: 60
    });

    expect(repository.createMasterMember).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionPercent: expect.objectContaining({})
      })
    );
  });

  it("lets admin update a manager member", async () => {
    const existingManager = memberRecord(Role.MANAGER, {
      id: "manager-membership",
      userId: "manager-user"
    });
    const updatedManager = memberRecord(Role.MANAGER, {
      id: "manager-membership",
      userId: "manager-user",
      user: {
        ...existingManager.user,
        name: "Updated Manager"
      }
    });

    repository.findMemberById.mockResolvedValue(existingManager);
    repository.updateMasterMember.mockResolvedValue(updatedManager);

    await expect(
      editMember(adminAuth, "manager-membership", {
        name: "Updated Manager",
        email: "manager@orchid.local",
        commissionPercent: null
      })
    ).resolves.toMatchObject({
      id: "manager-membership",
      name: "Updated Manager",
      role: "MANAGER"
    });

    expect(repository.updateMasterMember).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: "manager-membership",
        manageableRoles: [Role.MANAGER, Role.MASTER]
      })
    );
  });

  it("does not let admin update owner or admin members", async () => {
    repository.findMemberById.mockResolvedValue(memberRecord(Role.OWNER));

    await expect(
      editMember(adminAuth, "owner-membership", {
        name: "Owner",
        email: "owner@orchid.local"
      })
    ).rejects.toMatchObject({
      statusCode: 404
    });

    expect(repository.updateMasterMember).not.toHaveBeenCalled();
  });
});
