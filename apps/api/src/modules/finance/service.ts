import {
  apiErrorCodes,
  type CreateFinanceOperationInput,
  type FinanceOperationResponse,
  type FinanceOverviewResponse,
  type FinanceQuery
} from "@orchid/shared";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import { monthPeriod } from "../analytics/service.js";
import { assertActivePaymentMethod } from "../settings/service.js";
import { createManualFinanceOperation, getFinanceData } from "./repository.js";

type FinanceOperationRecord = Awaited<ReturnType<typeof getFinanceData>>["operations"][number];
type ManualFinanceOperationRecord = Awaited<ReturnType<typeof createManualFinanceOperation>>;
type FinanceOverviewQuery = Partial<FinanceQuery>;

function assertCanManageFinance(auth: AuthContext) {
  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function utcDateOnlyRange(query: FinanceOverviewQuery, timeZone: string) {
  if (!query.from && !query.to) {
    return monthPeriod(new Date(), timeZone);
  }

  const fallback = monthPeriod(new Date(), timeZone);

  return {
    from: query.from ? new Date(`${query.from}T00:00:00.000Z`) : fallback.from,
    to: query.to ? new Date(`${query.to}T23:59:59.999Z`) : fallback.to
  };
}

function operationDirectionSign(direction: "IN" | "OUT") {
  return direction === "IN" ? 1 : -1;
}

function toOperationResponse(operation: FinanceOperationRecord): FinanceOperationResponse {
  return {
    id: operation.id,
    source: operation.source,
    type: operation.type,
    direction: operation.direction,
    amountCents: operation.amountCents,
    signedAmountCents: operation.amountCents * operationDirectionSign(operation.direction),
    occurredAt: operation.occurredAt.toISOString(),
    description: operation.description,
    paymentMethodId: operation.paymentMethodId,
    paymentMethodName: operation.paymentMethodName,
    counterpartyName: operation.counterpartyName,
    repairOrderId: operation.repairOrderId,
    repairOrderNumber: operation.repairOrderNumber,
    createdByName: operation.createdByName,
    comment: operation.comment
  };
}

function manualOperationToResponse(operation: ManualFinanceOperationRecord): FinanceOperationResponse {
  const direction = operation.type === "DEPOSIT" ? "IN" : "OUT";

  return {
    id: operation.id,
    source: "MANUAL",
    type: operation.type,
    direction,
    amountCents: operation.amountCents,
    signedAmountCents: operation.amountCents * operationDirectionSign(direction),
    occurredAt: operation.occurredAt.toISOString(),
    description: operation.description,
    paymentMethodId: operation.paymentMethod?.id ?? null,
    paymentMethodName: operation.paymentMethod?.name ?? null,
    counterpartyName: null,
    repairOrderId: null,
    repairOrderNumber: null,
    createdByName: operation.createdBy?.name ?? null,
    comment: operation.comment
  };
}

export async function getFinanceOverview(
  auth: AuthContext,
  query: FinanceOverviewQuery = {}
): Promise<FinanceOverviewResponse> {
  assertCanManageFinance(auth);

  const period = utcDateOnlyRange(query, auth.user.organization.timezone);
  const data = await getFinanceData(auth.organizationId, {
    ...period,
    limit: query.limit ?? 80
  });
  const availableAfterObligationsCents = data.accountBalanceCents - data.payableCommissionsCents;
  const cashGapRiskCents = Math.max(0, -availableAfterObligationsCents);

  return {
    period: {
      from: data.period.from.toISOString(),
      to: data.period.to.toISOString()
    },
    account: {
      balanceCents: data.accountBalanceCents,
      availableAfterObligationsCents,
      cashGapRiskCents
    },
    summary: {
      paidRevenueCents: data.paidRevenueCents,
      paidCostCents: data.paidCostCents,
      grossProfitCents: data.grossProfitCents,
      confirmedExpensesCents: data.confirmedExpensesCents,
      paidCommissionsCents: data.paidCommissionsCents,
      payableCommissionsCents: data.payableCommissionsCents,
      manualInflowCents: data.manualInflowCents,
      manualOutflowCents: data.manualOutflowCents,
      netMovementCents:
        data.paidRevenueCents +
        data.manualInflowCents -
        data.confirmedExpensesCents -
        data.paidCommissionsCents -
        data.manualOutflowCents,
      repairOrdersCount: data.repairOrdersCount,
      paidOrdersCount: data.paidOrdersCount,
      unpaidOrdersCount: data.unpaidOrdersCount,
      partiallyPaidOrdersCount: data.partiallyPaidOrdersCount,
      receivablesCents: data.receivablesCents,
      averagePaidTicketCents: data.averagePaidTicketCents
    },
    analytics: data.analytics,
    masterCommissions: data.masterCommissions,
    receivableOrders: data.receivableOrders.map((order) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    })),
    operations: data.operations.map(toOperationResponse)
  };
}

export async function addFinanceOperation(
  auth: AuthContext,
  input: CreateFinanceOperationInput
): Promise<FinanceOperationResponse> {
  assertCanManageFinance(auth);

  await assertActivePaymentMethod(auth.organizationId, input.paymentMethodId);
  const operation = await createManualFinanceOperation(auth.organizationId, auth.userId, input);
  const response = manualOperationToResponse(operation);

  await writeAuditLog(auth, {
    entityType: "FinanceOperation",
    entityId: operation.id,
    action: "CREATE",
    afterJson: response,
    comment: "Manual finance operation created"
  });

  return response;
}
