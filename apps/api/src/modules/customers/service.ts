import { apiErrorCodes, type CustomerResponse, type UpdateCustomerInput } from "@orchid/shared";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import { findCustomer, updateCustomerProfile } from "./repository.js";

type CustomerRecord = NonNullable<Awaited<ReturnType<typeof findCustomer>>>;

function assertCanManageCustomers(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(customer: CustomerRecord): CustomerResponse {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    note: customer.note,
    updatedAt: customer.updatedAt.toISOString()
  };
}

export async function editCustomer(
  auth: AuthContext,
  id: string,
  input: UpdateCustomerInput
): Promise<CustomerResponse> {
  assertCanManageCustomers(auth);

  const existing = await findCustomer(auth.organizationId, id);

  if (!existing) {
    throw new AuthError(apiErrorCodes.notFound, "Customer not found", 404);
  }

  const before = toResponse(existing);
  const customer = await updateCustomerProfile(auth.organizationId, id, {
    name: input.name?.trim(),
    phone: input.phone === undefined ? undefined : input.phone || null,
    email: input.email === undefined ? undefined : input.email || null,
    note: input.note === undefined ? undefined : input.note || null
  });
  const after = toResponse(customer);

  await writeAuditLog(auth, {
    entityType: "Customer",
    entityId: customer.id,
    action: "UPDATE",
    beforeJson: before,
    afterJson: after,
    comment: "Customer profile updated"
  });

  return after;
}
