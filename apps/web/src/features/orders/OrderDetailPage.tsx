import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AuditLogListResponse,
  AddRepairOrderPaymentInput,
  CustomerResponse,
  MasterListResponse,
  PaymentMethodListResponse,
  RepairOrderResponse,
  ServiceCatalogItemResponse,
  ServiceCatalogListResponse
} from "@orchid/shared";

import {
  authHeaders,
  buildRepairOrderItemsPayload,
  calculateDraftTotals,
  centsToRubInput,
  createDraftItem,
  displayOrderNumber,
  draftItemsFromOrder,
  filterCatalogItems,
  fixedServiceTypes,
  money,
  request,
  type DraftOrderItem,
  type Screen
} from "../../app/app-core";
import { ConfirmDialog, GlassPanel, PageToolbar, TextAreaField } from "../../app/ui";
import { OrderItemsPanel, OrderSidePanel, PaymentConfirmDialog } from "./OrderDetailPanels";

type OrderPayment = RepairOrderResponse["payments"][number];
type AutosaveState = "idle" | "saving" | "saved";

function draftItemsSaveSnapshot(draftItems: DraftOrderItem[]) {
  try {
    const payload = buildRepairOrderItemsPayload(draftItems, true);

    return {
      payload,
      signature: JSON.stringify(payload)
    };
  } catch {
    return null;
  }
}

export function OrderDetailPage({
  accessToken,
  canChangeRepairStatus,
  canCorrectFinancials,
  canManageOrders,
  orderId,
  navigate
}: {
  accessToken: string;
  canChangeRepairStatus: boolean;
  canCorrectFinancials: boolean;
  canManageOrders: boolean;
  orderId?: string;
  navigate: (screen: Screen) => void;
}) {
  const [order, setOrder] = useState<RepairOrderResponse | null>(null);
  const [auditItems, setAuditItems] = useState<AuditLogListResponse["items"]>([]);
  const [masters, setMasters] = useState<MasterListResponse["items"]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodListResponse["items"]>([]);
  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItemResponse[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [itemsSaveState, setItemsSaveState] = useState<AutosaveState>("saved");
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState<OrderPayment | null>(null);
  const [paymentVoidReason, setPaymentVoidReason] = useState("");
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSavedItemsSignatureRef = useRef("");
  const latestDraftItemsSignatureRef = useRef("");
  const saveRequestIdRef = useRef(0);

  const replaceOrderDraftState = useCallback((nextOrder: RepairOrderResponse) => {
    const nextDraftItems = draftItemsFromOrder(nextOrder);
    const nextSnapshot = draftItemsSaveSnapshot(nextDraftItems);

    if (nextSnapshot) {
      lastSavedItemsSignatureRef.current = nextSnapshot.signature;
      latestDraftItemsSignatureRef.current = nextSnapshot.signature;
    }

    setOrder(nextOrder);
    setDraftItems(nextDraftItems);
    setItemsSaveState("saved");
  }, []);

  const loadAudit = useCallback(async () => {
    if (!canManageOrders || !orderId) {
      return;
    }

    setIsAuditLoading(true);

    try {
      const response = await request<AuditLogListResponse>(`/api/v1/repair-orders/${orderId}/audit`, {
        headers: authHeaders(accessToken)
      });

      setAuditItems(response.items);
    } catch {
      setAuditItems([]);
    } finally {
      setIsAuditLoading(false);
    }
  }, [accessToken, canManageOrders, orderId]);

  useEffect(() => {
    if (!orderId) {
      setError("Заказ не выбран.");
      return;
    }

    const headers = authHeaders(accessToken);
    const orderRequest = request<RepairOrderResponse>(`/api/v1/repair-orders/${orderId}`, { headers });

    if (!canManageOrders) {
      orderRequest
        .then((orderResponse) => {
          replaceOrderDraftState(orderResponse);
          setMasters([]);
          setPaymentMethods([]);
          setCatalogItems([]);
        })
        .catch(() => setError("Не удалось загрузить заказ."));
      return;
    }

    Promise.all([
      orderRequest,
      request<MasterListResponse>("/api/v1/repair-orders/masters", { headers }),
      request<PaymentMethodListResponse>("/api/v1/settings/payment-methods", { headers }),
      request<ServiceCatalogListResponse>("/api/v1/service-catalog", { headers })
    ])
      .then(([orderResponse, mastersResponse, paymentMethodsResponse, catalogResponse]) => {
        replaceOrderDraftState(orderResponse);
        setMasters(mastersResponse.items);
        setPaymentMethods(paymentMethodsResponse.items);
        setCatalogItems(catalogResponse.items.filter((item) => item.isActive && fixedServiceTypes.has(item.type)));
      })
      .catch(() => setError("Не удалось загрузить заказ."));
  }, [accessToken, canManageOrders, orderId, replaceOrderDraftState]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const isIssued = order?.repairStatus === "ISSUED";
  const isReadOnly = Boolean(isIssued || !canManageOrders);
  const isStatusReadOnly = Boolean(isIssued || !canChangeRepairStatus);
  const orderIdForSave = order?.id;
  const draftTotals = useMemo(() => calculateDraftTotals(draftItems), [draftItems]);
  const foundCatalogItems = useMemo(() => filterCatalogItems(catalogItems, serviceQuery), [catalogItems, serviceQuery]);

  useEffect(() => {
    if (!orderIdForSave || isReadOnly) {
      return undefined;
    }

    const snapshot = draftItemsSaveSnapshot(draftItems);

    latestDraftItemsSignatureRef.current = snapshot?.signature ?? "";

    if (!snapshot) {
      setItemsSaveState("idle");
      return undefined;
    }

    if (snapshot.signature === lastSavedItemsSignatureRef.current) {
      setItemsSaveState("saved");

      return undefined;
    }

    setItemsSaveState("idle");

    const timeoutId = window.setTimeout(async () => {
      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      setError(null);
      setIsSaving(true);
      setItemsSaveState("saving");

      try {
        const updated = await request<RepairOrderResponse>(`/api/v1/repair-orders/${orderIdForSave}/items`, {
          method: "PUT",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            items: snapshot.payload
          })
        });

        if (
          saveRequestIdRef.current !== requestId ||
          latestDraftItemsSignatureRef.current !== snapshot.signature
        ) {
          return;
        }

        replaceOrderDraftState(updated);
        void loadAudit();
      } catch {
        if (latestDraftItemsSignatureRef.current === snapshot.signature) {
          setError("Не удалось сохранить заказ. После выдачи заказ закрыт для изменений.");
          setItemsSaveState("idle");
        }
      } finally {
        if (saveRequestIdRef.current === requestId) {
          setIsSaving(false);
        }
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [accessToken, draftItems, isReadOnly, loadAudit, orderIdForSave, replaceOrderDraftState]);

  function updateDraftItem(localId: string, patch: Partial<DraftOrderItem>) {
    setError(null);
    setDraftItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  function removeDraftItem(localId: string) {
    if (draftItems.length <= 1) {
      setError("В заказе должна быть хотя бы одна позиция.");
      return;
    }

    setError(null);
    setDraftItems((current) => current.filter((item) => item.localId !== localId));
  }

  function addCatalogItem(item: ServiceCatalogItemResponse) {
    setError(null);
    setDraftItems((current) => [
      ...current,
      createDraftItem({
        serviceCatalogItemId: item.id,
        assignedMasterMembershipId: item.type === "SERVICE" ? (order?.assignedMasterMembershipId ?? null) : null,
        name: item.name,
        type: item.type,
        priceRub: centsToRubInput(item.defaultPriceCents),
        costRub: centsToRubInput(item.defaultCostCents)
      })
    ]);
    setServiceQuery("");
  }

  function addQuickItem(item: Partial<DraftOrderItem>) {
    setError(null);
    setDraftItems((current) => [
      ...current,
      createDraftItem({
        ...item,
        assignedMasterMembershipId: item.type === "SERVICE" ? (order?.assignedMasterMembershipId ?? null) : null
      })
    ]);
  }

  async function changeMaster(nextMasterId: string) {
    if (!order) {
      return;
    }

    const updated = await request<RepairOrderResponse>(`/api/v1/repair-orders/${order.id}/assignee`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        assignedMasterMembershipId: nextMasterId || null
      })
    });

    setOrder(updated);
  }

  async function changeStatus(repairStatus: RepairOrderResponse["repairStatus"]) {
    if (!order || !canChangeRepairStatus || repairStatus === "ISSUED") {
      return;
    }

    const updated = await request<RepairOrderResponse>(`/api/v1/repair-orders/${order.id}/status`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ repairStatus })
    });

    setOrder(updated);
    void loadAudit();
  }

  async function markPaid(input: AddRepairOrderPaymentInput) {
    if (!order) {
      return;
    }

    setError(null);
    setIsMarkingPaid(true);

    try {
      const updated = await request<RepairOrderResponse>(`/api/v1/repair-orders/${order.id}/mark-paid`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(input)
      });

      setOrder(updated);
      setShowPaymentConfirm(false);
      void loadAudit();
    } catch {
      setError("Не удалось принять оплату. Проверьте сумму, способ оплаты и статус заказа.");
    } finally {
      setIsMarkingPaid(false);
    }
  }

  async function voidPayment(payment: OrderPayment) {
    if (!order) {
      return;
    }

    const reason = paymentVoidReason.trim();

    if (reason.length < 3) {
      setError("Укажи причину отмены платежа.");
      return;
    }

    setError(null);
    setVoidingPaymentId(payment.id);

    try {
      const updated = await request<RepairOrderResponse>(
        `/api/v1/repair-orders/${order.id}/payments/${payment.id}/void`,
        {
          method: "POST",
          headers: authHeaders(accessToken),
          body: JSON.stringify({ reason })
        }
      );

      setOrder(updated);
      setPaymentToVoid(null);
      setPaymentVoidReason("");
      void loadAudit();
    } catch {
      setError("Не удалось отменить платеж. Проверьте права и актуальность заказа.");
    } finally {
      setVoidingPaymentId(null);
    }
  }

  const updateCustomerInOrder = useCallback((customer: CustomerResponse) => {
    setOrder((current) =>
      current
        ? {
            ...current,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            customerNote: customer.note
          }
        : current
    );
  }, []);

  if (!order) {
    return (
      <div>
        <PageToolbar back={() => navigate({ section: "orders", view: "list" })} title="Карточка заказа" />
        <GlassPanel className="p-5">
          <p className="text-white/62">{error ?? "Загружаем заказ..."}</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "orders", view: "list" })} title={displayOrderNumber(order.orderNumber)} />
      <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <OrderSidePanel
          accessToken={accessToken}
          auditItems={auditItems}
          canChangeRepairStatus={canChangeRepairStatus}
          canCorrectFinancials={canCorrectFinancials}
          canManageOrders={canManageOrders}
          draftItemsCount={draftItems.length}
          draftTotals={draftTotals}
          isAuditLoading={isAuditLoading}
          isIssued={Boolean(isIssued)}
          isMarkingPaid={isMarkingPaid}
          voidingPaymentId={voidingPaymentId}
          isReadOnly={isReadOnly}
          isStatusReadOnly={isStatusReadOnly}
          masters={masters}
          navigate={navigate}
          onCustomerUpdated={updateCustomerInOrder}
          onMasterChange={(nextMasterId) => void changeMaster(nextMasterId)}
          onPaymentRequested={() => setShowPaymentConfirm(true)}
          onPaymentVoidRequested={(payment) => {
            setPaymentToVoid(payment);
            setPaymentVoidReason("");
          }}
          onStatusChange={(repairStatus) => void changeStatus(repairStatus)}
          order={order}
        />
        <OrderItemsPanel
          canManageOrders={canManageOrders}
          draftItems={draftItems}
          error={error}
          foundCatalogItems={foundCatalogItems}
          isReadOnly={isReadOnly}
          isSaving={isSaving}
          itemsSaveState={itemsSaveState}
          masters={masters}
          navigate={navigate}
          onAddCatalogItem={addCatalogItem}
          onAddQuickItem={addQuickItem}
          onRemoveItem={removeDraftItem}
          onServiceQueryChange={setServiceQuery}
          onUpdateItem={updateDraftItem}
          order={order}
          serviceQuery={serviceQuery}
        />
      </div>
      {showPaymentConfirm ? (
        <PaymentConfirmDialog
          isBusy={isMarkingPaid}
          onCancel={() => setShowPaymentConfirm(false)}
          onConfirm={(input) => void markPaid(input)}
          order={order}
          paymentMethods={paymentMethods}
        />
      ) : null}
      {paymentToVoid ? (
        <ConfirmDialog
          confirmLabel="Отменить платеж"
          destructive
          isBusy={voidingPaymentId === paymentToVoid.id}
          onCancel={() => {
            setPaymentToVoid(null);
            setPaymentVoidReason("");
          }}
          onConfirm={() => void voidPayment(paymentToVoid)}
          title="Отменить платеж?"
        >
          <div className="grid gap-3">
            <p>
              Платеж <strong className="text-white">{money(paymentToVoid.amountCents)}</strong> будет исключен из оплаты заказа.
            </p>
            <TextAreaField
              label="Причина отмены"
              onChange={(event) => setPaymentVoidReason(event.target.value)}
              rows={3}
              value={paymentVoidReason}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
