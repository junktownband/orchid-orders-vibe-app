import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContext } from "../auth/service.js";

const repository = vi.hoisted(() => ({
  createAuditLogEntry: vi.fn(),
  listAuditLogs: vi.fn().mockResolvedValue([])
}));

vi.mock("./repository.js", () => repository);

const { getAuditLogs } = await import("./service.js");

const adminAuth: AuthContext = {
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
      timezone: "UTC"
    }
  }
};

describe("audit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listAuditLogs.mockResolvedValue([]);
  });

  it("passes action filters to the audit repository", async () => {
    await expect(
      getAuditLogs(adminAuth, {
        limit: 50,
        entityType: "RepairOrder",
        action: "ISSUE"
      })
    ).resolves.toEqual({ items: [] });

    expect(repository.listAuditLogs).toHaveBeenCalledWith("org-1", {
      limit: 50,
      entityType: "RepairOrder",
      action: "ISSUE"
    });
  });
});
