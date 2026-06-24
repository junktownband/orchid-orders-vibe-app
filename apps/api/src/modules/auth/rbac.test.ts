import { describe, expect, it } from "vitest";

import type { AuthContext } from "./service.js";
import { getMasterCommissions } from "../commissions/service.js";
import { getExpenses } from "../expenses/service.js";
import { getServiceCatalog } from "../service-catalog/service.js";
import {
  addExpenseCategory,
  addPaymentMethod,
  getExpenseCategories,
  getOrganizationSettings,
  getPaymentMethods,
  setTaxSettings
} from "../settings/service.js";

const masterAuth: AuthContext = {
  userId: "master-user",
  membershipId: "master-membership",
  organizationId: "org-1",
  role: "MASTER",
  user: {
    id: "master-user",
    email: "master@orchid.local",
    name: "Master",
    role: "MASTER",
    organization: {
      id: "org-1",
      name: "Orchid",
      currency: "RUB",
      timezone: "UTC"
    }
  }
};

const adminAuth: AuthContext = {
  ...masterAuth,
  userId: "admin-user",
  membershipId: "admin-membership",
  role: "ADMIN",
  user: {
    ...masterAuth.user,
    id: "admin-user",
    email: "admin@orchid.local",
    name: "Admin",
    role: "ADMIN"
  }
};

const managerAuth: AuthContext = {
  ...masterAuth,
  userId: "manager-user",
  membershipId: "manager-membership",
  role: "MANAGER",
  user: {
    ...masterAuth.user,
    id: "manager-user",
    email: "manager@orchid.local",
    name: "Manager",
    role: "MANAGER"
  }
};

describe("master RBAC", () => {
  it("blocks master from back-office APIs", async () => {
    await expect(getExpenses(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    await expect(getServiceCatalog(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    await expect(getOrganizationSettings(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    await expect(getPaymentMethods(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    await expect(getExpenseCategories(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    await expect(getMasterCommissions(masterAuth)).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("allows only owner to change organization tax mode", async () => {
    await expect(setTaxSettings(adminAuth, { taxMode: "SELF_EMPLOYED" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });
  });

  it("blocks manager from editing payment and expense references", async () => {
    await expect(addPaymentMethod(managerAuth, { name: "Касса" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });
    await expect(addExpenseCategory(managerAuth, { name: "Материалы" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403
    });
  });
});
