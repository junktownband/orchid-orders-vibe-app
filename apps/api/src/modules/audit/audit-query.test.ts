import { describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  authenticate: vi.fn().mockResolvedValue({
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
  }),
  AuthError: class AuthError extends Error {
    code: string;
    statusCode: number;
    errors: unknown[];

    constructor(code: string, message: string, statusCode: number, errors: unknown[] = []) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.errors = errors;
    }
  }
}));

const audit = vi.hoisted(() => ({
  getAuditLogs: vi.fn().mockResolvedValue({ items: [] })
}));

vi.mock("../auth/service.js", () => auth);
vi.mock("./service.js", () => audit);

const { buildApp } = await import("../../app.js");

describe("audit query", () => {
  it("accepts an action filter through the audit API", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/audit?limit=50&entityType=RepairOrder&action=ISSUE",
      headers: {
        authorization: "Bearer access-token"
      }
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(audit.getAuditLogs).toHaveBeenCalledWith(expect.any(Object), {
      limit: 50,
      entityType: "RepairOrder",
      action: "ISSUE"
    });
  });
});
