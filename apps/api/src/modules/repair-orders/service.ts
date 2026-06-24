import {
  apiErrorCodes,
  type AddRepairOrderPaymentInput,
  type AssignRepairOrderMasterInput,
  type CreateRepairOrderInput,
  type IssueRepairOrderInput,
  type MasterListResponse,
  type RepairOrderItemInput,
  type RepairOrderResponse,
  type RepairOrdersQuery,
  type UpdateRepairOrderItemsInput,
  type UpdateRepairOrderStatusInput,
  type VoidRepairOrderPaymentInput
} from "@orchid/shared";

import { getAuditLogs, writeAuditLog } from "../audit/service.js";
import { AuthError, type AuthContext } from "../auth/service.js";
import { getOrCreateOrganizationSettings } from "../settings/repository.js";
import { assertActivePaymentMethod } from "../settings/service.js";
import {
  addRepairOrderPayment,
  countRepairOrders,
  createRepairOrder,
  decodeRepairOrderCursor,
  findMaster,
  findMastersByIds,
  findRepairOrder,
  findServiceCatalogItems,
  issueRepairOrder,
  listMasters,
  listRepairOrders,
  replaceRepairOrderItems,
  updateRepairOrderMaster,
  updateRepairOrderStatus,
  voidRepairOrderPayment
} from "./repository.js";

type RepairOrderRecord = NonNullable<Awaited<ReturnType<typeof findRepairOrder>>>;

const selfEmployedTaxRateBySubject = {
  INDIVIDUAL: 400,
  BUSINESS: 600
} as const;

const orderNumberAllocationAttempts = 5;

function isUniqueConstraintError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;

  if (code !== "P2002") {
    return false;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;

  if (!target) {
    return true;
  }

  return Array.isArray(target) ? target.includes("orderNumber") : String(target).includes("orderNumber");
}

function assertCanManageOrders(auth: AuthContext) {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function assertCanChangeRepairStatus(auth: AuthContext, repairStatus: UpdateRepairOrderStatusInput["repairStatus"]) {
  if (["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    return;
  }

  if (auth.role === "MASTER" && (repairStatus === "IN_PROGRESS" || repairStatus === "READY")) {
    return;
  }

  throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
}

function assertCanCorrectFinancials(auth: AuthContext) {
  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }
}

function formatInstrument(instrument: RepairOrderRecord["instrument"]) {
  if (!instrument) {
    return null;
  }

  return [instrument.brand, instrument.model].filter(Boolean).join(" ") || instrument.type;
}

function normalizeItems(input: CreateRepairOrderInput): RepairOrderItemInput[] {
  if (input.items && input.items.length > 0) {
    return input.items;
  }

  if (input.totalAmountCents) {
    return [
      {
        name: input.description,
        type: "SERVICE",
        priceCents: input.totalAmountCents,
        costCents: 0
      }
    ];
  }

  throw new AuthError(apiErrorCodes.validation, "Repair order must contain at least one item", 400);
}

async function assertCatalogItemsExist(organizationId: string, items: RepairOrderItemInput[]) {
  const catalogIds = [...new Set(items.flatMap((item) => (item.serviceCatalogItemId ? [item.serviceCatalogItemId] : [])))];

  if (catalogIds.length === 0) {
    return;
  }

  const catalogItems = await findServiceCatalogItems(organizationId, catalogIds);
  const foundIds = new Set(catalogItems.map((item) => item.id));
  const missingId = catalogIds.find((id) => !foundIds.has(id));

  if (missingId) {
    throw new AuthError(apiErrorCodes.notFound, "Service catalog item not found", 404);
  }
}

async function assertItemMastersExist(organizationId: string, items: RepairOrderItemInput[]) {
  const masterIds = [
    ...new Set(
      items.flatMap((item) => (item.assignedMasterMembershipId ? [item.assignedMasterMembershipId] : []))
    )
  ];

  if (masterIds.length === 0) {
    return;
  }

  const masters = await findMastersByIds(organizationId, masterIds);
  const foundIds = new Set(masters.map((master) => master.id));
  const missingId = masterIds.find((id) => !foundIds.has(id));

  if (missingId) {
    throw new AuthError(apiErrorCodes.notFound, "Master not found", 404);
  }
}

function assignServiceItemMasters(items: RepairOrderItemInput[], fallbackMasterId?: string | null) {
  return items.map((item) => ({
    ...item,
    assignedMasterMembershipId:
      item.type === "SERVICE" ? (item.assignedMasterMembershipId ?? fallbackMasterId ?? null) : null
  }));
}

function calculateItemTotals(items: RepairOrderItemInput[]) {
  const totalAmountCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const totalCostCents = items.reduce((sum, item) => sum + item.costCents, 0);

  return {
    totalAmountCents,
    totalCostCents,
    grossProfitCents: totalAmountCents - totalCostCents
  };
}

function toResponse(order: RepairOrderRecord): RepairOrderResponse {
  const paidAmountCents = order.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    title: order.title,
    description: order.description,
    totalAmountCents: order.totalAmountCents,
    totalCostCents: order.totalCostCents,
    grossProfitCents: order.grossProfitCents,
    repairStatus: order.repairStatus,
    paymentStatus: order.paymentStatus,
    paidAmountCents,
    balanceDueCents: order.totalAmountCents - paidAmountCents,
    paidAt: order.paidAt?.toISOString() ?? null,
    issuedAt: order.issuedAt?.toISOString() ?? null,
    taxModeSnapshot: order.taxModeSnapshot,
    taxSubject: order.taxSubject,
    taxRateBps: order.taxRateBps,
    taxAmountCents: order.taxAmountCents,
    paidByName: order.paidBy?.name ?? null,
    assignedMasterMembershipId: order.assignedMasterMembershipId,
    assignedMasterName: order.assignedMaster?.user.name ?? null,
    customerId: order.customer?.id ?? null,
    customerName: order.customer?.name ?? null,
    customerPhone: order.customer?.phone ?? null,
    customerEmail: order.customer?.email ?? null,
    customerNote: order.customer?.note ?? null,
    instrumentName: formatInstrument(order.instrument),
    items: order.lineItems.map((item) => ({
      id: item.id,
      serviceCatalogItemId: item.serviceCatalogItemId,
      assignedMasterMembershipId: item.assignedMasterMembershipId,
      assignedMasterName: item.assignedMaster?.user.name ?? null,
      name: item.nameSnapshot,
      type: item.type,
      priceCents: item.priceCents,
      costCents: item.costCents,
      commissionPercentSnapshot: item.commissionPercentSnapshot ? Number(item.commissionPercentSnapshot) : null,
      commissionBaseCents: item.commissionBaseCents,
      commissionAmountCents: item.commissionAmountCents,
      commissionCalculatedAt: item.commissionCalculatedAt?.toISOString() ?? null,
      commissionPayoutStatus: item.commissionPayoutStatus,
      commissionPaidAt: item.commissionPaidAt?.toISOString() ?? null,
      commissionPaidByName: item.commissionPaidBy?.name ?? null
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt.toISOString(),
      paymentMethodId: payment.paymentMethodId,
      paymentMethodName: payment.paymentMethod?.name ?? null,
      acceptedByName: payment.acceptedBy?.name ?? null,
      comment: payment.comment
    })),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString()
  };
}

function orderAuditSnapshot(order: RepairOrderRecord) {
  return {
    orderNumber: order.orderNumber,
    totalAmountCents: order.totalAmountCents,
    totalCostCents: order.totalCostCents,
    grossProfitCents: order.grossProfitCents,
    repairStatus: order.repairStatus,
    paymentStatus: order.paymentStatus,
    assignedMasterMembershipId: order.assignedMasterMembershipId,
    assignedMasterName: order.assignedMaster?.user.name ?? null,
    items: order.lineItems.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      type: item.type,
      priceCents: item.priceCents,
      costCents: item.costCents,
      assignedMasterMembershipId: item.assignedMasterMembershipId
    }))
  };
}

export async function getRepairOrders(auth: AuthContext, query: RepairOrdersQuery) {
  const cursor = query.cursor ? decodeRepairOrderCursor(query.cursor) : undefined;

  if (query.cursor && !cursor) {
    throw new AuthError(apiErrorCodes.validation, "Invalid pagination cursor", 400, [
      {
        field: "cursor",
        message: "Invalid pagination cursor"
      }
    ]);
  }

  const result = await listRepairOrders(auth.organizationId, {
    q: query.q || undefined,
    tab: query.tab,
    repairStatus: query.repairStatus,
    paymentStatus: query.paymentStatus,
    cursor: cursor ?? undefined,
    limit: query.limit
  });

  return {
    items: result.items.map(toResponse),
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  };
}

export async function getRepairOrderById(auth: AuthContext, id: string) {
  const order = await findRepairOrder(auth.organizationId, id);

  if (!order) {
    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }

  return toResponse(order);
}

export async function getRepairOrderAudit(auth: AuthContext, id: string) {
  const order = await findRepairOrder(auth.organizationId, id);

  if (!order) {
    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }

  return getAuditLogs(auth, {
    entityType: "RepairOrder",
    entityId: id,
    limit: 50
  });
}

export async function addRepairOrder(auth: AuthContext, input: CreateRepairOrderInput) {
  assertCanManageOrders(auth);

  const rawItems = normalizeItems(input);
  const assignedMasterMembershipId = input.assignedMasterMembershipId || null;

  if (assignedMasterMembershipId) {
    const master = await findMaster(auth.organizationId, assignedMasterMembershipId);

    if (!master) {
      throw new AuthError(apiErrorCodes.notFound, "Master not found", 404);
    }
  }

  await assertCatalogItemsExist(auth.organizationId, rawItems);
  await assertItemMastersExist(auth.organizationId, rawItems);

  const items = assignServiceItemMasters(rawItems, assignedMasterMembershipId);
  const totals = calculateItemTotals(items);
  const customerPhone = input.customer.phone?.trim() || null;

  for (let attempt = 0; attempt < orderNumberAllocationAttempts; attempt += 1) {
    const nextNumber = (await countRepairOrders(auth.organizationId)) + 1;
    const orderNumber = String(nextNumber).padStart(5, "0");

    try {
      const order = await createRepairOrder(auth.organizationId, {
        orderNumber,
        customer: {
          name: input.customer.name,
          phone: customerPhone,
          email: input.customer.email || null
        },
        instrument: input.instrument
          ? {
              type: input.instrument.type || "guitar",
              brand: input.instrument.brand || null,
              model: input.instrument.model || null,
              serialNumber: input.instrument.serialNumber || null,
              note: input.instrument.note || null
            }
          : undefined,
        description: input.description,
        ...totals,
        items,
        assignedMasterMembershipId,
        acceptedAt: input.acceptedAt ? new Date(input.acceptedAt) : undefined,
        comment: input.comment
      });

      await writeAuditLog(auth, {
        entityType: "RepairOrder",
        entityId: order.id,
        action: "CREATE",
        afterJson: orderAuditSnapshot(order),
        comment: "Repair order created"
      });

      return toResponse(order);
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === orderNumberAllocationAttempts - 1) {
        throw error;
      }
    }
  }

  throw new AuthError(apiErrorCodes.conflict, "Repair order number allocation failed", 409);
}

export async function setRepairOrderItems(auth: AuthContext, id: string, input: UpdateRepairOrderItemsInput) {
  assertCanManageOrders(auth);
  await assertCatalogItemsExist(auth.organizationId, input.items);
  await assertItemMastersExist(auth.organizationId, input.items);

  try {
    const before = await findRepairOrder(auth.organizationId, id);
    const order = await replaceRepairOrderItems(auth.organizationId, id, {
      ...calculateItemTotals(input.items),
      items: assignServiceItemMasters(input.items)
    });

    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "UPDATE",
      beforeJson: before ? orderAuditSnapshot(before) : null,
      afterJson: orderAuditSnapshot(order),
      comment: "Repair order items updated"
    });

    return toResponse(order);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }
}

export async function setRepairOrderStatus(auth: AuthContext, id: string, input: UpdateRepairOrderStatusInput) {
  assertCanChangeRepairStatus(auth, input.repairStatus);

  try {
    const order = await updateRepairOrderStatus(auth.organizationId, id, input.repairStatus);
    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "STATUS_CHANGE",
      afterJson: {
        repairStatus: order.repairStatus
      },
      comment: `Repair order status changed to ${order.repairStatus}`
    });
    return toResponse(order);
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }
}

export async function setRepairOrderIssued(auth: AuthContext, id: string, input: IssueRepairOrderInput) {
  assertCanManageOrders(auth);

  try {
    const settings = await getOrCreateOrganizationSettings(auth.organizationId);
    const existingOrder = await findRepairOrder(auth.organizationId, id);

    if (!existingOrder) {
      throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
    }

    const alreadyPaidCents = existingOrder.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const finalAmountCents = existingOrder.totalAmountCents;

    if (alreadyPaidCents > finalAmountCents) {
      throw new AuthError(
        apiErrorCodes.businessRuleViolation,
        "Accepted prepayment cannot exceed order total",
        422
      );
    }

    const requiresPaymentMethod = alreadyPaidCents < finalAmountCents;

    if (requiresPaymentMethod && !input.paymentMethodId) {
      throw new AuthError(apiErrorCodes.validation, "Payment method is required", 400, [
        {
          field: "paymentMethodId",
          message: "Payment method is required"
        }
      ]);
    }

    if (input.paymentMethodId) {
      await assertActivePaymentMethod(auth.organizationId, input.paymentMethodId);
    }

    const taxSubject = settings.taxMode === "SELF_EMPLOYED" ? input.taxSubject : undefined;

    if (settings.taxMode === "SELF_EMPLOYED" && !taxSubject) {
      throw new AuthError(apiErrorCodes.validation, "Tax subject is required", 400, [
        {
          field: "taxSubject",
          message: "Tax subject is required"
        }
      ]);
    }

    const taxRateBps = taxSubject ? selfEmployedTaxRateBySubject[taxSubject] : null;
    const taxAmountCents = taxRateBps ? Math.round((finalAmountCents * taxRateBps) / 10000) : null;
    const order = await issueRepairOrder(auth.organizationId, id, {
      finalAmountCents,
      paidByUserId: auth.userId,
      paymentMethodId: input.paymentMethodId ?? null,
      taxModeSnapshot: taxSubject ? settings.taxMode : null,
      taxSubject: taxSubject ?? null,
      taxRateBps,
      taxAmountCents
    });

    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "ISSUE",
      afterJson: {
        finalAmountCents: order.totalAmountCents,
        repairStatus: order.repairStatus,
        paymentStatus: order.paymentStatus,
        taxModeSnapshot: order.taxModeSnapshot,
        taxSubject: order.taxSubject,
        taxRateBps: order.taxRateBps,
        taxAmountCents: order.taxAmountCents
      },
      comment: "Repair order issued"
    });

    return toResponse(order);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error instanceof Error && error.message === "Payment amount exceeds order total") {
      throw new AuthError(
        apiErrorCodes.businessRuleViolation,
        "Accepted prepayment cannot exceed order total",
        422
      );
    }

    throw new AuthError(apiErrorCodes.businessRuleViolation, "Repair order cannot be changed after issue", 409);
  }
}

export async function setRepairOrderPaid(auth: AuthContext, id: string, input: AddRepairOrderPaymentInput) {
  assertCanManageOrders(auth);

  try {
    await assertActivePaymentMethod(auth.organizationId, input.paymentMethodId);

    const order = await addRepairOrderPayment(auth.organizationId, id, {
      acceptedByUserId: auth.userId,
      paymentMethodId: input.paymentMethodId,
      amountCents: input.amountCents,
      comment: input.comment ?? null
    });
    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "PAYMENT_ADDED",
      afterJson: {
        paymentStatus: order.paymentStatus,
        paidAmountCents: order.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
        amountCents: input.amountCents ?? null,
        paymentMethodId: input.paymentMethodId,
        paidAt: order.paidAt?.toISOString() ?? null,
        paidByUserId: order.paidByUserId
      },
      comment: "Repair order marked as paid"
    });
    return toResponse(order);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.message === "Payment amount exceeds order total") {
        throw new AuthError(
          apiErrorCodes.businessRuleViolation,
          "Payment amount cannot exceed order balance",
          422
        );
      }

      if (error.message === "Payment amount must be positive") {
        throw new AuthError(apiErrorCodes.businessRuleViolation, "Payment amount must be positive", 422);
      }

      if (error.message === "Repair order is issued") {
        throw new AuthError(apiErrorCodes.conflict, "Repair order cannot be changed after issue", 409);
      }
    }

    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }
}

export async function setRepairOrderPaymentVoided(
  auth: AuthContext,
  id: string,
  paymentId: string,
  input: VoidRepairOrderPaymentInput
) {
  assertCanCorrectFinancials(auth);

  try {
    const before = await findRepairOrder(auth.organizationId, id);
    const order = await voidRepairOrderPayment(auth.organizationId, id, paymentId, {
      reason: input.reason
    });

    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "PAYMENT_VOIDED",
      beforeJson: before
        ? {
            paymentStatus: before.paymentStatus,
            paidAmountCents: before.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
            paidAt: before.paidAt?.toISOString() ?? null
          }
        : null,
      afterJson: {
        paymentId,
        reason: input.reason,
        paymentStatus: order.paymentStatus,
        paidAmountCents: order.payments.reduce((sum, payment) => sum + payment.amountCents, 0),
        paidAt: order.paidAt?.toISOString() ?? null
      },
      comment: "Repair order payment voided"
    });

    return toResponse(order);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(apiErrorCodes.notFound, "Payment not found", 404);
  }
}

export async function setRepairOrderMaster(
  auth: AuthContext,
  id: string,
  input: AssignRepairOrderMasterInput
) {
  assertCanManageOrders(auth);

  const assignedMasterMembershipId = input.assignedMasterMembershipId || null;

  if (assignedMasterMembershipId) {
    const master = await findMaster(auth.organizationId, assignedMasterMembershipId);

    if (!master) {
      throw new AuthError(apiErrorCodes.notFound, "Master not found", 404);
    }
  }

  try {
    const before = await findRepairOrder(auth.organizationId, id);
    const order = await updateRepairOrderMaster(auth.organizationId, id, assignedMasterMembershipId);

    await writeAuditLog(auth, {
      entityType: "RepairOrder",
      entityId: order.id,
      action: "UPDATE",
      beforeJson: before
        ? {
            assignedMasterMembershipId: before.assignedMasterMembershipId,
            assignedMasterName: before.assignedMaster?.user.name ?? null
          }
        : null,
      afterJson: {
        assignedMasterMembershipId: order.assignedMasterMembershipId,
        assignedMasterName: order.assignedMaster?.user.name ?? null
      },
      comment: "Repair order assignee updated"
    });

    return toResponse(order);
  } catch {
    throw new AuthError(apiErrorCodes.notFound, "Repair order not found", 404);
  }
}

export async function getMasters(auth: AuthContext): Promise<MasterListResponse> {
  const masters = await listMasters(auth.organizationId);

  return {
    items: masters.map((master) => ({
      id: master.id,
      name: master.user.name,
      role: master.role
    }))
  };
}
