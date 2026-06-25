import bcrypt from "bcryptjs";

import {
  apiErrorCodes,
  type CreateExpenseCategoryInput,
  type CreateMemberInput,
  type CreatePaymentMethodInput,
  type ExpenseCategoryListResponse,
  type ExpenseCategoryResponse,
  type MemberListResponse,
  type MemberResponse,
  type OrganizationSettingsResponse,
  type PaymentMethodListResponse,
  type PaymentMethodResponse,
  type UpdateExpenseCategoryInput,
  type UpdateMemberInput,
  type UpdatePaymentMethodInput,
  type UpdateTaxSettingsInput
} from "@orchid/shared";

import { Prisma, Role } from "@orchid/db";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import {
  createExpenseCategory,
  createPaymentMethod,
  findActiveExpenseCategory,
  findActivePaymentMethod,
  createMasterMember,
  findMemberById,
  findUserWithOrganizationMembership,
  getOrCreateOrganizationSettings,
  listExpenseCategories,
  listMasterMembers,
  listPaymentMethods,
  reactivateMasterMember,
  updateExpenseCategory,
  updateMasterMember,
  updateOrganizationTaxSettings,
  updatePaymentMethod
} from "./repository.js";

const selfEmployedIndividualRateBps = 400 as const;
const selfEmployedBusinessRateBps = 600 as const;
const defaultWorkshopCommissionPercent = 60;

type SettingsRecord = Awaited<ReturnType<typeof getOrCreateOrganizationSettings>>;
type PaymentMethodRecord = Awaited<ReturnType<typeof listPaymentMethods>>[number];
type ExpenseCategoryRecord = Awaited<ReturnType<typeof listExpenseCategories>>[number];
type MemberRecord = Awaited<ReturnType<typeof listMasterMembers>>[number];

function assertCanReadSettings(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function assertCanManageTaxSettings(auth: AuthContext) {
  if (auth.role !== "OWNER") {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function assertCanManageReferenceSettings(auth: AuthContext) {
  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(settings: SettingsRecord): OrganizationSettingsResponse {
  return {
    id: settings.id,
    taxMode: settings.taxMode,
    selfEmployedIndividualRateBps,
    selfEmployedBusinessRateBps,
    updatedAt: settings.updatedAt.toISOString()
  };
}

function toPaymentMethodResponse(method: PaymentMethodRecord): PaymentMethodResponse {
  return {
    id: method.id,
    name: method.name,
    isActive: method.isActive,
    sortOrder: method.sortOrder,
    createdAt: method.createdAt.toISOString(),
    updatedAt: method.updatedAt.toISOString()
  };
}

function toExpenseCategoryResponse(category: ExpenseCategoryRecord): ExpenseCategoryResponse {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString()
  };
}

function commissionPercentToApi(value: Prisma.Decimal | null): number | null {
  return value ? Number(value) * 100 : null;
}

function commissionPercentToDb(value: number | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Prisma.Decimal(value).div(100);
}

function toMemberResponse(member: MemberRecord): MemberResponse {
  return {
    id: member.id,
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    phone: member.user.phone,
    role: member.role,
    commissionPercent: commissionPercentToApi(member.commissionPercent),
    isActive: member.isActive,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString()
  };
}

function assertCanManageMembers(auth: AuthContext) {
  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function manageableMemberRoles(auth: AuthContext): Role[] {
  if (auth.role === "OWNER") {
    return [Role.OWNER, Role.ADMIN, Role.MANAGER, Role.MASTER];
  }

  if (auth.role === "ADMIN") {
    return [Role.MANAGER, Role.MASTER];
  }

  return [];
}

export async function getOrganizationSettings(auth: AuthContext): Promise<OrganizationSettingsResponse> {
  assertCanReadSettings(auth);

  const settings = await getOrCreateOrganizationSettings(auth.organizationId);
  return toResponse(settings);
}

export async function setTaxSettings(
  auth: AuthContext,
  input: UpdateTaxSettingsInput
): Promise<OrganizationSettingsResponse> {
  assertCanManageTaxSettings(auth);

  const existing = await getOrCreateOrganizationSettings(auth.organizationId);

  if (existing.taxMode === input.taxMode) {
    return toResponse(existing);
  }

  const settings = await updateOrganizationTaxSettings(auth.organizationId, input.taxMode);
  const before = toResponse(existing);
  const after = toResponse(settings);

  await writeAuditLog(auth, {
    entityType: "OrganizationSetting",
    entityId: settings.id,
    action: "UPDATE",
    beforeJson: before,
    afterJson: after,
    comment: "Tax settings updated"
  });

  return after;
}

export async function getPaymentMethods(auth: AuthContext): Promise<PaymentMethodListResponse> {
  assertCanReadSettings(auth);

  const methods = await listPaymentMethods(auth.organizationId, auth.role === "MANAGER");

  return {
    items: methods.map(toPaymentMethodResponse)
  };
}

export async function addPaymentMethod(
  auth: AuthContext,
  input: CreatePaymentMethodInput
): Promise<PaymentMethodResponse> {
  assertCanManageReferenceSettings(auth);

  try {
    const method = await createPaymentMethod({
      organizationId: auth.organizationId,
      name: input.name.trim(),
      sortOrder: input.sortOrder
    });
    const response = toPaymentMethodResponse(method);

    await writeAuditLog(auth, {
      entityType: "PaymentMethod",
      entityId: method.id,
      action: "CREATE",
      afterJson: response,
      comment: "Payment method created"
    });

    return response;
  } catch {
    throw new AuthError(apiErrorCodes.conflict, "Payment method already exists", 409);
  }
}

export async function editPaymentMethod(
  auth: AuthContext,
  id: string,
  input: UpdatePaymentMethodInput
): Promise<PaymentMethodResponse> {
  assertCanManageReferenceSettings(auth);

  try {
    const method = await updatePaymentMethod({
      organizationId: auth.organizationId,
      id,
      name: input.name?.trim(),
      isActive: input.isActive,
      sortOrder: input.sortOrder
    });
    const response = toPaymentMethodResponse(method);
    const action = input.isActive === false ? "DELETE" : "UPDATE";

    await writeAuditLog(auth, {
      entityType: "PaymentMethod",
      entityId: method.id,
      action,
      afterJson: response,
      comment: action === "DELETE" ? "Payment method deactivated" : "Payment method updated"
    });

    return response;
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Payment method not found", 404);
  }
}

export async function getExpenseCategories(auth: AuthContext): Promise<ExpenseCategoryListResponse> {
  assertCanReadSettings(auth);

  const categories = await listExpenseCategories(auth.organizationId, auth.role === "MANAGER");

  return {
    items: categories.map(toExpenseCategoryResponse)
  };
}

export async function addExpenseCategory(
  auth: AuthContext,
  input: CreateExpenseCategoryInput
): Promise<ExpenseCategoryResponse> {
  assertCanManageReferenceSettings(auth);

  try {
    const category = await createExpenseCategory({
      organizationId: auth.organizationId,
      name: input.name.trim(),
      color: input.color ?? null,
      sortOrder: input.sortOrder
    });
    const response = toExpenseCategoryResponse(category);

    await writeAuditLog(auth, {
      entityType: "ExpenseCategory",
      entityId: category.id,
      action: "CREATE",
      afterJson: response,
      comment: "Expense category created"
    });

    return response;
  } catch {
    throw new AuthError(apiErrorCodes.conflict, "Expense category already exists", 409);
  }
}

export async function editExpenseCategory(
  auth: AuthContext,
  id: string,
  input: UpdateExpenseCategoryInput
): Promise<ExpenseCategoryResponse> {
  assertCanManageReferenceSettings(auth);

  try {
    const category = await updateExpenseCategory({
      organizationId: auth.organizationId,
      id,
      name: input.name?.trim(),
      color: input.color,
      isActive: input.isActive,
      sortOrder: input.sortOrder
    });
    const response = toExpenseCategoryResponse(category);
    const action = input.isActive === false ? "DELETE" : "UPDATE";

    await writeAuditLog(auth, {
      entityType: "ExpenseCategory",
      entityId: category.id,
      action,
      afterJson: response,
      comment: action === "DELETE" ? "Expense category deactivated" : "Expense category updated"
    });

    return response;
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Expense category not found", 404);
  }
}

export async function assertActivePaymentMethod(organizationId: string, id: string) {
  const method = await findActivePaymentMethod(organizationId, id);

  if (!method) {
    throw new AuthError(apiErrorCodes.notFound, "Payment method not found", 404);
  }

  return method;
}

export async function assertActiveExpenseCategory(organizationId: string, id: string) {
  const category = await findActiveExpenseCategory(organizationId, id);

  if (!category) {
    throw new AuthError(apiErrorCodes.notFound, "Expense category not found", 404);
  }

  return category;
}

export async function getMembers(auth: AuthContext): Promise<MemberListResponse> {
  assertCanManageMembers(auth);

  const members = await listMasterMembers(auth.organizationId, manageableMemberRoles(auth));

  return {
    items: members.map(toMemberResponse)
  };
}

export async function addMember(auth: AuthContext, input: CreateMemberInput): Promise<MemberResponse> {
  assertCanManageMembers(auth);

  const email = input.email.trim().toLowerCase();
  const existingUser = await findUserWithOrganizationMembership(email, auth.organizationId);
  const existingMembership = existingUser?.memberships[0];
  const commissionPercent = commissionPercentToDb(input.commissionPercent ?? defaultWorkshopCommissionPercent);

  if (existingMembership && existingMembership.role !== Role.MASTER) {
    throw new AuthError(apiErrorCodes.conflict, "Only master accounts can be managed from this screen", 409);
  }

  const member = existingMembership
    ? await reactivateMasterMember({
        membershipId: existingMembership.id,
        name: input.name.trim(),
        phone: input.phone || null,
        commissionPercent
      })
    : await createMasterMember({
        organizationId: auth.organizationId,
        email,
        name: input.name.trim(),
        phone: input.phone || null,
        passwordHash: await bcrypt.hash(input.password ?? "orchid12345", 10),
        commissionPercent
      });

  await writeAuditLog(auth, {
    entityType: "Membership",
    entityId: member.id,
    action: "CREATE",
    afterJson: toMemberResponse(member),
    comment: "Master member created or reactivated"
  });

  return toMemberResponse(member);
}

export async function editMember(auth: AuthContext, id: string, input: UpdateMemberInput): Promise<MemberResponse> {
  assertCanManageMembers(auth);

  const manageableRoles = manageableMemberRoles(auth);
  const existing = await findMemberById(auth.organizationId, id);

  if (!existing || !manageableRoles.includes(existing.role)) {
    throw new AuthError(apiErrorCodes.notFound, "Member not found", 404);
  }

  if (input.isActive === false && existing.id === auth.membershipId) {
    throw new AuthError(apiErrorCodes.conflict, "You cannot deactivate your own account", 409);
  }

  if (input.email) {
    const emailOwner = await findUserWithOrganizationMembership(input.email.trim().toLowerCase(), auth.organizationId);

    if (emailOwner && emailOwner.id !== existing.userId) {
      throw new AuthError(apiErrorCodes.conflict, "Email already belongs to another user", 409);
    }
  }

  const before = toMemberResponse(existing);
  const member = await updateMasterMember({
    organizationId: auth.organizationId,
    membershipId: id,
    name: input.name?.trim(),
    email: input.email?.trim().toLowerCase(),
    phone: input.phone === undefined ? undefined : input.phone || null,
    commissionPercent: commissionPercentToDb(input.commissionPercent),
    isActive: input.isActive,
    manageableRoles
  });
  const after = toMemberResponse(member);

  await writeAuditLog(auth, {
    entityType: "Membership",
    entityId: member.id,
    action: input.isActive === false ? "DELETE" : "UPDATE",
    beforeJson: before,
    afterJson: after,
    comment: input.isActive === false ? "Member deactivated" : "Member updated"
  });

  return after;
}

export async function removeMember(auth: AuthContext, id: string): Promise<MemberResponse> {
  return editMember(auth, id, {
    isActive: false
  });
}
