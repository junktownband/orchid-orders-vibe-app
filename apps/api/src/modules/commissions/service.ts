import {
  apiErrorCodes,
  type MarkMasterCommissionsPaidInput,
  type MasterCommissionBulkPayoutResponse,
  type MasterCommissionListResponse,
  type MasterCommissionQuery,
  type MasterCommissionResponse
} from "@orchid/shared";

import { writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import {
  listMasterCommissions,
  markMasterCommissionPaid,
  markMasterCommissionsPaid,
  summarizeMasterCommissions
} from "./repository.js";

type MasterCommissionRecord = Awaited<ReturnType<typeof listMasterCommissions>>[number];

function assertCanManageCommissions(auth: AuthContext) {
  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function toResponse(item: MasterCommissionRecord): MasterCommissionResponse {
  return {
    id: item.id,
    repairOrderId: item.repairOrderId,
    repairOrderNumber: item.repairOrder.orderNumber,
    repairOrderItemId: item.id,
    repairOrderItemName: item.nameSnapshot,
    masterMembershipId: item.assignedMasterMembershipId,
    masterName: item.assignedMaster?.user.name ?? null,
    customerName: item.repairOrder.customer?.name ?? null,
    commissionBaseCents: item.commissionBaseCents ?? 0,
    commissionAmountCents: item.commissionAmountCents ?? 0,
    commissionPercentSnapshot: item.commissionPercentSnapshot ? Number(item.commissionPercentSnapshot) : null,
    commissionCalculatedAt: item.commissionCalculatedAt?.toISOString() ?? null,
    commissionPayoutStatus: item.commissionPayoutStatus,
    commissionPaidAt: item.commissionPaidAt?.toISOString() ?? null,
    commissionPaidByName: item.commissionPaidBy?.name ?? null,
    issuedAt: item.repairOrder.issuedAt?.toISOString() ?? null
  };
}

export async function getMasterCommissions(
  auth: AuthContext,
  query: MasterCommissionQuery = {}
): Promise<MasterCommissionListResponse> {
  assertCanManageCommissions(auth);

  const [records, totals] = await Promise.all([
    listMasterCommissions(auth.organizationId, query),
    summarizeMasterCommissions(auth.organizationId, query)
  ]);
  const items = records.map(toResponse);

  return {
    items,
    totals
  };
}

export async function setMasterCommissionPaid(
  auth: AuthContext,
  repairOrderItemId: string
): Promise<MasterCommissionResponse> {
  assertCanManageCommissions(auth);

  try {
    const item = await markMasterCommissionPaid(auth.organizationId, repairOrderItemId, auth.userId);
    await writeAuditLog(auth, {
      entityType: "RepairOrderItem",
      entityId: item.id,
      action: "COMMISSION_PAID",
      afterJson: {
        repairOrderId: item.repairOrderId,
        repairOrderNumber: item.repairOrder.orderNumber,
        itemName: item.nameSnapshot,
        masterMembershipId: item.assignedMasterMembershipId,
        masterName: item.assignedMaster?.user.name ?? null,
        commissionAmountCents: item.commissionAmountCents,
        commissionPayoutStatus: item.commissionPayoutStatus,
        commissionPaidAt: item.commissionPaidAt?.toISOString() ?? null
      },
      comment: "Master commission marked as paid"
    });

    return toResponse(item);
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Commission not found", 404);
  }
}

export async function setMasterCommissionsPaid(
  auth: AuthContext,
  input: MarkMasterCommissionsPaidInput
): Promise<MasterCommissionBulkPayoutResponse> {
  assertCanManageCommissions(auth);

  const repairOrderItemIds = [...new Set(input.repairOrderItemIds)];

  try {
    const items = await markMasterCommissionsPaid(auth.organizationId, repairOrderItemIds, auth.userId);

    await Promise.all(
      items.map((item) =>
        writeAuditLog(auth, {
          entityType: "RepairOrderItem",
          entityId: item.id,
          action: "COMMISSION_PAID",
          afterJson: {
            repairOrderId: item.repairOrderId,
            repairOrderNumber: item.repairOrder.orderNumber,
            itemName: item.nameSnapshot,
            masterMembershipId: item.assignedMasterMembershipId,
            masterName: item.assignedMaster?.user.name ?? null,
            commissionAmountCents: item.commissionAmountCents,
            commissionPayoutStatus: item.commissionPayoutStatus,
            commissionPaidAt: item.commissionPaidAt?.toISOString() ?? null
          },
          comment: "Master commission marked as paid in bulk"
        })
      )
    );

    return {
      items: items.map(toResponse),
      paidCount: items.length,
      paidCents: items.reduce((sum, item) => sum + (item.commissionAmountCents ?? 0), 0)
    };
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Commission not found", 404);
  }
}
