import {
  apiErrorCodes,
  type CreateExpenseInput,
  type ExpenseListResponse,
  type ExpenseResponse,
  type VoidExpenseInput
} from "@orchid/shared";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import {
  confirmExpense,
  createExpense,
  findExpenseRepairOrder,
  findExpenseRepairOrderItem,
  listExpenses,
  voidExpense
} from "./repository.js";
import { assertActiveExpenseCategory, assertActivePaymentMethod } from "../settings/service.js";

type ExpenseRecord = Awaited<ReturnType<typeof listExpenses>>[number];

function assertCanManageExpenses(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(expense: ExpenseRecord): ExpenseResponse {
  return {
    id: expense.id,
    amountCents: expense.amountCents,
    spentAt: expense.spentAt.toISOString(),
    spentByName: expense.spentByName,
    description: expense.description,
    kind: expense.kind,
    status: expense.status,
    categoryId: expense.categoryId,
    categoryName: expense.category?.name ?? null,
    categoryColor: expense.category?.color ?? null,
    paymentMethodId: expense.paymentMethodId,
    paymentMethodName: expense.paymentMethod?.name ?? null,
    repairOrderId: expense.repairOrderId,
    repairOrderNumber: expense.repairOrder?.orderNumber ?? null,
    repairOrderItemId: expense.repairOrderItemId,
    repairOrderItemName: expense.repairOrderItem?.nameSnapshot ?? null,
    voidedAt: expense.voidedAt?.toISOString() ?? null,
    voidReason: expense.voidReason,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString()
  };
}

async function normalizeLinks(auth: AuthContext, input: CreateExpenseInput) {
  let repairOrderId = input.repairOrderId || null;
  const repairOrderItemId = input.repairOrderItemId || null;

  if (repairOrderItemId) {
    const item = await findExpenseRepairOrderItem(auth.organizationId, repairOrderItemId);

    if (!item) {
      throw new AuthError(apiErrorCodes.notFound, "Repair order item not found", 404);
    }

    if (repairOrderId && repairOrderId !== item.repairOrderId) {
      throw new AuthError(apiErrorCodes.businessRuleViolation, "Expense item belongs to another order", 422);
    }

    repairOrderId = item.repairOrderId;
  }

  if (repairOrderId) {
    const order = await findExpenseRepairOrder(auth.organizationId, repairOrderId);

    if (!order) {
      throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
    }
  }

  return {
    repairOrderId,
    repairOrderItemId
  };
}

export async function getExpenses(auth: AuthContext): Promise<ExpenseListResponse> {
  assertCanManageExpenses(auth);

  const expenses = await listExpenses(auth.organizationId);

  return {
    items: expenses.map(toResponse)
  };
}

export async function addExpense(auth: AuthContext, input: CreateExpenseInput): Promise<ExpenseResponse> {
  assertCanManageExpenses(auth);

  const links = await normalizeLinks(auth, input);
  const categoryId = input.categoryId || null;
  const paymentMethodId = input.paymentMethodId || null;

  if (categoryId) {
    await assertActiveExpenseCategory(auth.organizationId, categoryId);
  }

  if (paymentMethodId) {
    await assertActivePaymentMethod(auth.organizationId, paymentMethodId);
  }

  const expense = await createExpense(auth.organizationId, auth.userId, {
    categoryId,
    repairOrderId: links.repairOrderId,
    repairOrderItemId: links.repairOrderItemId,
    paymentMethodId,
    amountCents: input.amountCents,
    spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
    spentByName: input.spentByName || null,
    description: input.description,
    comment: input.comment || null
  });

  await writeAuditLog(auth, {
    entityType: "Expense",
    entityId: expense.id,
    action: "CREATE",
    afterJson: {
      amountCents: expense.amountCents,
      repairOrderId: expense.repairOrderId,
      repairOrderItemId: expense.repairOrderItemId,
      status: expense.status
    },
    comment: "Expense created"
  });

  return toResponse(expense);
}

export async function setExpenseConfirmed(auth: AuthContext, id: string): Promise<ExpenseResponse> {
  assertCanManageExpenses(auth);

  try {
    const expense = await confirmExpense(auth.organizationId, id);
    await writeAuditLog(auth, {
      entityType: "Expense",
      entityId: expense.id,
      action: "CONFIRM",
      afterJson: {
        status: expense.status,
        confirmedAt: expense.confirmedAt?.toISOString() ?? null,
        amountCents: expense.amountCents,
        repairOrderId: expense.repairOrderId,
        repairOrderItemId: expense.repairOrderItemId
      },
      comment: "Expense confirmed"
    });
    return toResponse(expense);
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Expense not found", 404);
  }
}

export async function setExpenseVoided(
  auth: AuthContext,
  id: string,
  input: VoidExpenseInput
): Promise<ExpenseResponse> {
  assertCanManageExpenses(auth);

  try {
    const expense = await voidExpense(auth.organizationId, id, input.reason);

    await writeAuditLog(auth, {
      entityType: "Expense",
      entityId: expense.id,
      action: "VOID",
      afterJson: {
        status: expense.status,
        voidedAt: expense.voidedAt?.toISOString() ?? null,
        voidReason: expense.voidReason,
        amountCents: expense.amountCents,
        repairOrderId: expense.repairOrderId,
        repairOrderItemId: expense.repairOrderItemId
      },
      comment: "Expense voided"
    });

    return toResponse(expense);
  } catch (error) {
    if (error instanceof Error && error.message === "System expense cannot be voided here") {
      throw new AuthError(apiErrorCodes.businessRuleViolation, error.message, 422);
    }

    throw new AuthError(apiErrorCodes.notFound, "Expense not found", 404);
  }
}
