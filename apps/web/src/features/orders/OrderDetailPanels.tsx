import { History, Plus, Search, Trash2, WalletCards } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";

import type {
  AddRepairOrderPaymentInput,
  AuditLogResponse,
  CustomerResponse,
  MasterListResponse,
  PaymentMethodResponse,
  RepairOrderResponse,
  ServiceCatalogItemResponse
} from "@orchid/shared";

import {
  authHeaders,
  auditActionLabel,
  auditActionTone,
  centsToRubInput,
  dateTime,
  displayOrderNumber,
  draftItemNameLabel,
  draftItemPriceLabel,
  errorMessage,
  formatPhoneInput,
  isCatalogServiceItem,
  isServiceItem,
  marginPercentFrom,
  money,
  paymentStatusLabel,
  percent,
  quickOrderItems,
  repairStatusLabel,
  repairStatusOptions,
  request,
  resaleTypes,
  serviceTypeLabel,
  rubToCents,
  type DraftOrderItem,
  type Screen
} from "../../app/app-core";
import {
  ConfirmDialog,
  GhostButton,
  GlassPanel,
  ModalLayer,
  PrimaryButton,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField
} from "../../app/ui";

type DraftTotals = {
  priceCents: number;
  costCents: number;
};

type AutosaveState = "idle" | "saving" | "saved";

function DetailSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-white/[0.08] pt-4 ${className}`}>{children}</div>;
}

function DetailStat({
  label,
  value,
  tone = "text-white"
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 border-t border-white/[0.07] pt-3 first:border-t-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 sm:first:border-l-0">
      <p className="text-xs uppercase text-white/38">{label}</p>
      <p className={`mt-1 break-words text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function AuditTimelinePanel({ items, isLoading }: { items: AuditLogResponse[]; isLoading: boolean }) {
  return (
    <details className="border-t border-white/[0.08] pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
        <h3 className="text-lg font-semibold">Журнал действий</h3>
        <History aria-hidden="true" className="text-white/36" size={20} />
      </summary>
      <div className="mt-4 grid gap-3">
        {isLoading ? <p className="text-sm text-white/50">Загружаем историю...</p> : null}
        {!isLoading && items.length === 0 ? <p className="text-sm text-white/50">Пока нет событий по заказу.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-white/[0.08] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={auditActionLabel(item.action)} tone={auditActionTone(item.action)} />
              <span className="text-xs text-white/42">{dateTime(item.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-white/62">
              {item.userName ? `Автор: ${item.userName}` : "Системное событие"}
              {item.comment ? ` · ${item.comment}` : ""}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

export function CustomerProfilePanel({
  accessToken,
  canEdit,
  order,
  onCustomerUpdated
}: {
  accessToken: string;
  canEdit: boolean;
  order: RepairOrderResponse;
  onCustomerUpdated: (customer: CustomerResponse) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(order.customerName ?? "");
  const [phone, setPhone] = useState(order.customerPhone ?? "");
  const [email, setEmail] = useState(order.customerEmail ?? "");
  const [note, setNote] = useState(order.customerNote ?? "");
  const [saveState, setSaveState] = useState<AutosaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const savedSignature = JSON.stringify({
    email: order.customerEmail ?? "",
    name: order.customerName ?? "",
    note: order.customerNote ?? "",
    phone: order.customerPhone ?? ""
  });
  const draftSignature = JSON.stringify({ email, name, note, phone });

  useEffect(() => {
    setName(order.customerName ?? "");
    setPhone(order.customerPhone ?? "");
    setEmail(order.customerEmail ?? "");
    setNote(order.customerNote ?? "");
    setError(null);
    setSaveState("saved");
  }, [order.customerEmail, order.customerName, order.customerNote, order.customerPhone, order.customerId]);

  useEffect(() => {
    setIsEditing(false);
  }, [order.customerId]);

  useEffect(() => {
    if (!isEditing || !order.customerId) {
      return undefined;
    }

    if (!name.trim() || draftSignature === savedSignature) {
      setSaveState(draftSignature === savedSignature ? "saved" : "idle");
      return undefined;
    }

    setSaveState("idle");

    const timeoutId = window.setTimeout(async () => {
      setError(null);
      setSaveState("saving");

      try {
        const customer = await request<CustomerResponse>(`/api/v1/customers/${order.customerId}`, {
          method: "PATCH",
          headers: authHeaders(accessToken),
          body: JSON.stringify({
            name: name.trim(),
            phone: phone || null,
            email: email || null,
            note: note || null
          })
        });

        onCustomerUpdated(customer);
        setSaveState("saved");
      } catch (requestError) {
        setError(errorMessage(requestError, "Не удалось сохранить клиента."));
        setSaveState("idle");
      }
    }, 650);

    return () => window.clearTimeout(timeoutId);
  }, [accessToken, draftSignature, email, isEditing, name, note, onCustomerUpdated, order.customerId, phone, savedSignature]);

  return (
    <DetailSection>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/48">Клиент</p>
          <h3 className="mt-1 text-lg font-semibold">{order.customerName ?? "Клиент не указан"}</h3>
          {order.customerPhone ? <p className="mt-1 text-sm text-white/52">{order.customerPhone}</p> : null}
          {order.customerEmail ? <p className="mt-1 text-sm text-white/52">{order.customerEmail}</p> : null}
          {order.customerNote ? <p className="mt-2 text-sm leading-6 text-white/45">{order.customerNote}</p> : null}
        </div>
        {canEdit && order.customerId ? (
          <GhostButton className="h-9 px-3" onClick={() => setIsEditing((value) => !value)} type="button">
            {isEditing ? "Скрыть" : "Редактировать"}
          </GhostButton>
        ) : null}
      </div>
      {isEditing ? (
        <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4">
          <TextField autoComplete="name" label="Имя клиента" onChange={(event) => setName(event.target.value)} value={name} />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="Телефон"
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            type="tel"
            value={phone}
          />
          <TextField autoComplete="email" label="Email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          <TextAreaField label="Заметка" onChange={(event) => setNote(event.target.value)} rows={3} value={note} />
          {error ? <p className="text-sm text-coral">{error}</p> : null}
          {!name.trim() || saveState === "saving" ? (
            <p className="text-xs text-white/38">
              {!name.trim() ? "Укажи имя клиента" : "Сохраняем..."}
            </p>
          ) : null}
        </div>
      ) : null}
    </DetailSection>
  );
}

export function OrderSidePanel({
  accessToken,
  auditItems,
  canChangeRepairStatus,
  canCorrectFinancials,
  canManageOrders,
  draftItemsCount,
  draftTotals,
  isAuditLoading,
  isIssued,
  isMarkingPaid,
  voidingPaymentId,
  isReadOnly,
  isStatusReadOnly,
  masters,
  navigate,
  order,
  onCustomerUpdated,
  onMasterChange,
  onPaymentRequested,
  onPaymentVoidRequested,
  onStatusChange
}: {
  accessToken: string;
  auditItems: AuditLogResponse[];
  canChangeRepairStatus: boolean;
  canCorrectFinancials: boolean;
  canManageOrders: boolean;
  draftItemsCount: number;
  draftTotals: DraftTotals;
  isAuditLoading: boolean;
  isIssued: boolean;
  isMarkingPaid: boolean;
  voidingPaymentId: string | null;
  isReadOnly: boolean;
  isStatusReadOnly: boolean;
  masters: MasterListResponse["items"];
  navigate: (screen: Screen) => void;
  order: RepairOrderResponse;
  onCustomerUpdated: (customer: CustomerResponse) => void;
  onMasterChange: (nextMasterId: string) => void;
  onPaymentRequested: () => void;
  onPaymentVoidRequested: (payment: RepairOrderResponse["payments"][number]) => void;
  onStatusChange: (repairStatus: RepairOrderResponse["repairStatus"]) => void;
}) {
  const paymentTone =
    order.paymentStatus === "PAID"
      ? "mint"
      : order.paymentStatus === "PARTIALLY_PAID"
        ? "amber"
        : "neutral";
  const repairTone =
    order.repairStatus === "ISSUED"
      ? "mint"
      : order.repairStatus === "READY"
        ? "amber"
        : order.repairStatus === "CANCELLED"
          ? "coral"
          : "neutral";
  const availableStatusOptions = repairStatusOptions.filter((status) => {
    if (canManageOrders) {
      return status.value !== "ISSUED" || order.repairStatus === "ISSUED";
    }

    if (!canChangeRepairStatus) {
      return status.value === order.repairStatus;
    }

    return status.value === order.repairStatus || status.value === "IN_PROGRESS" || status.value === "READY";
  });
  const draftBalanceDueCents = Math.max(draftTotals.priceCents - order.paidAmountCents, 0);

  return (
    <GlassPanel className="grid content-start gap-4 p-5">
      <div>
        <p className="text-sm text-white/45">{order.customerName ?? "Клиент не указан"}</p>
        {order.customerPhone ? <p className="mt-1 text-sm text-white/45">{order.customerPhone}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold">{order.instrumentName || order.description}</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">{order.description}</p>
      </div>

      <div className="grid gap-4 border-y border-white/[0.07] py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-white/40">Состояние</p>
          <div className="mt-2">
            <StatusPill label={repairStatusLabel(order.repairStatus)} tone={repairTone} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-white/40">Оплата</p>
          <div className="mt-2">
            <StatusPill label={paymentStatusLabel(order.paymentStatus)} tone={paymentTone} />
          </div>
        </div>
      </div>

      {canManageOrders ? (
        <div className="grid gap-3 border-b border-white/[0.07] pb-4 sm:grid-cols-3">
          <DetailStat label="Итого" value={money(draftTotals.priceCents)} />
          <DetailStat label="Оплачено" tone="text-mint" value={money(order.paidAmountCents)} />
          <DetailStat
            label="Остаток"
            tone={draftBalanceDueCents > 0 ? "text-amber" : "text-white"}
            value={money(draftBalanceDueCents)}
          />
        </div>
      ) : null}

      {isIssued ? (
        <div className="rounded-lg bg-mint/10 p-3 text-sm text-mint ring-1 ring-mint/20">
          Заказ выдан и закрыт. Редактирование заблокировано.
        </div>
      ) : canManageOrders ? (
        <DetailSection>
          <p className="text-sm text-white/48">Действия</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {order.paymentStatus !== "PAID" ? (
              <GhostButton disabled={isMarkingPaid} onClick={onPaymentRequested} type="button">
                {isMarkingPaid ? "Принимаем..." : order.paidAmountCents > 0 ? "Принять доплату" : "Принять оплату"}
              </GhostButton>
            ) : null}
            <PrimaryButton onClick={() => navigate({ section: "orders", view: "issue", orderId: order.id })} type="button">
              Выдать заказ
            </PrimaryButton>
          </div>
        </DetailSection>
      ) : null}

      <div className="grid gap-3 border-t border-white/[0.08] pt-4">
        <p className="text-sm text-white/48">Настройки</p>
        <SelectField
          disabled={isStatusReadOnly}
          label="Статус"
          onChange={(event) => onStatusChange(event.target.value as RepairOrderResponse["repairStatus"])}
          value={order.repairStatus}
        >
          {availableStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          disabled={isReadOnly}
          label="Ответственный"
          onChange={(event) => onMasterChange(event.target.value)}
          value={order.assignedMasterMembershipId ?? ""}
        >
          <option value="">Ответственный не выбран</option>
          {masters.map((master) => (
            <option key={master.id} value={master.id}>
              {master.name}
            </option>
          ))}
        </SelectField>
      </div>

      <CustomerProfilePanel
        accessToken={accessToken}
        canEdit={canManageOrders}
        onCustomerUpdated={onCustomerUpdated}
        order={order}
      />

      <DetailSection className="grid gap-3 sm:grid-cols-2">
        <DetailStat label="Создан" value={dateTime(order.createdAt)} />
        <DetailStat label="Закрыт" value={dateTime(order.issuedAt)} />
      </DetailSection>

      {canManageOrders ? (
        <DetailSection>
          <p className="text-sm text-white/48">Оплата</p>
          <div className="mt-3 grid gap-2">
            {order.payments.length === 0 ? <p className="text-sm text-white/45">Платежей пока нет.</p> : null}
            {order.payments.map((payment) => (
              <div key={payment.id} className="border-t border-white/[0.07] py-3 text-sm first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white">{money(payment.amountCents)}</span>
                  <span className="text-white/42">{dateTime(payment.paidAt)}</span>
                </div>
                <p className="mt-1 text-white/48">
                  {payment.paymentMethodName ?? "Способ не указан"}
                  {payment.acceptedByName ? ` · принял ${payment.acceptedByName}` : ""}
                </p>
                {canCorrectFinancials && !isIssued ? (
                  <GhostButton
                    className="mt-3 h-9 px-3 text-coral"
                    disabled={voidingPaymentId === payment.id}
                    onClick={() => onPaymentVoidRequested(payment)}
                    type="button"
                  >
                    {voidingPaymentId === payment.id ? "Отменяем…" : "Отменить платеж"}
                  </GhostButton>
                ) : null}
              </div>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {canManageOrders && !isIssued ? (
        <DetailSection>
          <GhostButton className="w-full" onClick={() => navigate({ section: "expenses", view: "create", orderId: order.id })} type="button">
            <WalletCards size={17} />
            Расход к заказу
          </GhostButton>
        </DetailSection>
      ) : null}

      {canManageOrders ? (
        <DetailSection>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/48">Итог заказа</p>
              <p className="mt-1 text-xs text-white/38">{draftItemsCount} позиций</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ring-1 ${
                draftTotals.priceCents - draftTotals.costCents < 0
                  ? "bg-coral/14 text-coral ring-coral/25"
                  : "bg-mint/12 text-mint ring-mint/25"
              }`}
            >
              {percent(marginPercentFrom(draftTotals.priceCents, draftTotals.costCents))}%
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DetailStat label="Цена" value={money(draftTotals.priceCents)} />
            <DetailStat label="Себестоимость" value={money(draftTotals.costCents)} />
            <DetailStat
              label="Маржа"
              tone={draftTotals.priceCents - draftTotals.costCents < 0 ? "text-coral" : "text-mint"}
              value={money(draftTotals.priceCents - draftTotals.costCents)}
            />
          </div>
        </DetailSection>
      ) : null}
      {canManageOrders ? <AuditTimelinePanel isLoading={isAuditLoading} items={auditItems} /> : null}
    </GlassPanel>
  );
}

function DraftItemActions({
  isReadOnly,
  item,
  order,
  navigate,
  onRemove
}: {
  isReadOnly: boolean;
  item: DraftOrderItem;
  order: RepairOrderResponse;
  navigate: (screen: Screen) => void;
  onRemove: (localId: string) => void;
}) {
  if (isReadOnly) {
    return null;
  }

  const itemName = item.name || serviceTypeLabel(item.type);

  return (
    <div className="flex gap-2">
      {item.id ? (
        <GhostButton
          aria-label={`Добавить расход к позиции ${itemName}`}
          className="h-11 px-3"
          onClick={() =>
            navigate({
              section: "expenses",
              view: "create",
              orderId: order.id,
              itemId: item.id
            })
          }
          type="button"
        >
          <WalletCards size={16} />
        </GhostButton>
      ) : null}
      <GhostButton
        aria-label={`Удалить позицию ${itemName}`}
        className="h-11 px-0 text-coral sm:w-11"
        onClick={() => onRemove(item.localId)}
        type="button"
      >
        <Trash2 size={16} />
      </GhostButton>
    </div>
  );
}

function DraftItemEditor({
  isReadOnly,
  item,
  masters,
  navigate,
  order,
  onRemove,
  onUpdate
}: {
  isReadOnly: boolean;
  item: DraftOrderItem;
  masters: MasterListResponse["items"];
  navigate: (screen: Screen) => void;
  order: RepairOrderResponse;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, patch: Partial<DraftOrderItem>) => void;
}) {
  const isStandardService = isCatalogServiceItem(item);
  const isService = isServiceItem(item);

  if (isStandardService) {
    return (
      <div key={item.localId} className="grid gap-4 border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <StatusPill label="Стандартная услуга" tone="mint" />
            <h4 className="mt-1 font-semibold text-white">{item.name}</h4>
          </div>
          <DraftItemActions isReadOnly={isReadOnly} item={item} navigate={navigate} onRemove={onRemove} order={order} />
        </div>
        <div className="grid gap-3 border-t border-white/[0.06] pt-3 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            disabled={isReadOnly}
            inputMode="decimal"
            label={draftItemPriceLabel(item)}
            onChange={(event) => onUpdate(item.localId, { priceRub: event.target.value })}
            value={item.priceRub}
          />
          <TextField
            disabled={isReadOnly}
            inputMode="decimal"
            label="Себестоимость, ₽"
            onChange={(event) => onUpdate(item.localId, { costRub: event.target.value })}
            value={item.costRub}
          />
          <SelectField
            disabled={isReadOnly}
            label="Мастер услуги"
            onChange={(event) => onUpdate(item.localId, { assignedMasterMembershipId: event.target.value || null })}
            value={item.assignedMasterMembershipId ?? ""}
          >
            <option value="">Мастер не выбран</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    );
  }

  return (
    <div key={item.localId} className="grid gap-4 border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusPill label={serviceTypeLabel(item.type)} tone={isService ? "mint" : "amber"} />
        </div>
        <DraftItemActions isReadOnly={isReadOnly} item={item} navigate={navigate} onRemove={onRemove} order={order} />
      </div>
      <TextField
        disabled={isReadOnly}
        label={draftItemNameLabel(item)}
        onChange={(event) => onUpdate(item.localId, { name: event.target.value })}
        value={item.name}
      />
      <div className={`grid gap-3 ${isService ? "" : "md:grid-cols-2"}`}>
        <TextField
          disabled={isReadOnly}
          inputMode="decimal"
          label={draftItemPriceLabel(item)}
          onChange={(event) => onUpdate(item.localId, { priceRub: event.target.value })}
          value={item.priceRub}
        />
        {resaleTypes.has(item.type) ? (
          <TextField
            disabled={isReadOnly}
            inputMode="decimal"
            label="Себестоимость, ₽"
            onChange={(event) => onUpdate(item.localId, { costRub: event.target.value })}
            value={item.costRub}
          />
        ) : null}
        {isService ? (
          <SelectField
            disabled={isReadOnly}
            label="Мастер услуги"
            onChange={(event) => onUpdate(item.localId, { assignedMasterMembershipId: event.target.value || null })}
            value={item.assignedMasterMembershipId ?? ""}
          >
            <option value="">Мастер не выбран</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>
    </div>
  );
}

function AddOrderItemDialog({
  foundCatalogItems,
  onAddCatalogItem,
  onAddQuickItem,
  onClose,
  onServiceQueryChange,
  serviceQuery
}: {
  foundCatalogItems: ServiceCatalogItemResponse[];
  onAddCatalogItem: (item: ServiceCatalogItemResponse) => void;
  onAddQuickItem: (item: Partial<DraftOrderItem>) => void;
  onClose: () => void;
  onServiceQueryChange: (value: string) => void;
  serviceQuery: string;
}) {
  const titleId = useId();

  return (
    <ModalLayer>
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/62 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-6">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-2xl flex-col rounded-xl border border-white/[0.12] bg-panel/80 p-5 text-white shadow-glass backdrop-blur-[28px] sm:max-h-[calc(100dvh_-_3rem)]"
        role="dialog"
      >
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-xl font-semibold" id={titleId}>
            Добавить позицию
          </h2>
          <GhostButton className="h-10 px-3" onClick={onClose} type="button">
            Отмена
          </GhostButton>
        </div>

        <div className="mt-4 overflow-y-auto overscroll-contain pr-1">
          <div className="grid gap-4">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 text-white/35" size={17} />
              <TextField
                className="pl-9"
                label="Найти стандартную услугу"
                onChange={(event) => onServiceQueryChange(event.target.value)}
                placeholder="Проточка, порожек, отстройка..."
                value={serviceQuery}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {foundCatalogItems.length > 0 ? (
                foundCatalogItems.map((item) => (
                  <button
                    key={item.id}
                    className="rounded-lg border border-white/[0.12] bg-white/[0.065] px-3 py-3 text-left text-sm text-white shadow-inner-glass transition-[background-color,border-color,box-shadow] hover:border-white/[0.2] hover:bg-white/[0.105] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/25"
                    onClick={() => onAddCatalogItem(item)}
                    type="button"
                  >
                    <span className="block font-medium">{item.name}</span>
                    <span className="mt-1 block text-xs text-white/55">
                      {money(item.defaultPriceCents)} · себ. {money(item.defaultCostCents)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-white/45">Стандартная услуга не найдена.</p>
              )}
            </div>

            <div className="grid gap-2 border-t border-white/[0.08] pt-4 sm:grid-cols-2">
              {quickOrderItems.map((quickItem) => (
                <button
                  key={quickItem.label}
                  className="rounded-lg border border-white/[0.12] bg-white/[0.065] px-3 py-3 text-left text-sm text-white shadow-inner-glass transition-[background-color,border-color,box-shadow] hover:border-white/[0.2] hover:bg-white/[0.105] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/25"
                  onClick={() => onAddQuickItem(quickItem.item)}
                  type="button"
                >
                  {quickItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
    </ModalLayer>
  );
}

export function OrderItemsPanel({
  canManageOrders,
  draftItems,
  error,
  foundCatalogItems,
  isReadOnly,
  isSaving,
  itemsSaveState,
  masters,
  navigate,
  order,
  serviceQuery,
  onAddCatalogItem,
  onAddQuickItem,
  onRemoveItem,
  onServiceQueryChange,
  onUpdateItem
}: {
  canManageOrders: boolean;
  draftItems: DraftOrderItem[];
  error: string | null;
  foundCatalogItems: ServiceCatalogItemResponse[];
  isReadOnly: boolean;
  isSaving: boolean;
  itemsSaveState: AutosaveState;
  masters: MasterListResponse["items"];
  navigate: (screen: Screen) => void;
  order: RepairOrderResponse;
  serviceQuery: string;
  onAddCatalogItem: (item: ServiceCatalogItemResponse) => void;
  onAddQuickItem: (item: Partial<DraftOrderItem>) => void;
  onRemoveItem: (localId: string) => void;
  onServiceQueryChange: (value: string) => void;
  onUpdateItem: (localId: string, patch: Partial<DraftOrderItem>) => void;
}) {
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const isAutosaving = isSaving || itemsSaveState === "saving";

  function closeAddItemDialog() {
    setShowAddItemDialog(false);
    onServiceQueryChange("");
  }

  function addCatalogItemFromDialog(item: ServiceCatalogItemResponse) {
    onAddCatalogItem(item);
    closeAddItemDialog();
  }

  function addQuickItemFromDialog(item: Partial<DraftOrderItem>) {
    onAddQuickItem(item);
    closeAddItemDialog();
  }

  return (
    <GlassPanel className="overflow-hidden p-5">
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Позиции заказа</h3>
            <p className="mt-1 text-sm text-white/45">{draftItems.length} позиций</p>
          </div>
          {canManageOrders && !isReadOnly ? (
            <PrimaryButton onClick={() => setShowAddItemDialog(true)} type="button">
              <Plus aria-hidden="true" size={17} />
              Добавить позицию
            </PrimaryButton>
          ) : null}
        </div>
        {canManageOrders ? (
          <>
            <div className="mt-4 grid gap-3">
              {draftItems.map((item) => (
                <DraftItemEditor
                  key={item.localId}
                  isReadOnly={isReadOnly}
                  item={item}
                  masters={masters}
                  navigate={navigate}
                  onRemove={onRemoveItem}
                  onUpdate={onUpdateItem}
                  order={order}
                />
              ))}
              {draftItems.length === 0 ? (
                <p className="border-t border-white/[0.08] pt-4 text-sm text-white/45">Позиции пока не добавлены.</p>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            {!isReadOnly && isAutosaving ? (
              <p className="mt-3 text-xs text-white/38">Сохраняем...</p>
            ) : null}
          </>
        ) : (
          <div className="mt-4 grid gap-3">
            {draftItems.map((item) => (
              <div key={item.localId} className="border-t border-white/[0.08] pt-4 first:border-t-0 first:pt-0">
                <StatusPill label={serviceTypeLabel(item.type)} tone={isServiceItem(item) ? "mint" : "amber"} />
                <h4 className="mt-2 font-semibold text-white">{item.name || serviceTypeLabel(item.type)}</h4>
              </div>
            ))}
          </div>
        )}
      </div>
      {showAddItemDialog ? (
        <AddOrderItemDialog
          foundCatalogItems={foundCatalogItems}
          onAddCatalogItem={addCatalogItemFromDialog}
          onAddQuickItem={addQuickItemFromDialog}
          onClose={closeAddItemDialog}
          onServiceQueryChange={onServiceQueryChange}
          serviceQuery={serviceQuery}
        />
      ) : null}
    </GlassPanel>
  );
}

export function PaymentConfirmDialog({
  isBusy,
  order,
  onCancel,
  onConfirm,
  paymentMethods
}: {
  isBusy: boolean;
  order: RepairOrderResponse;
  onCancel: () => void;
  onConfirm: (input: AddRepairOrderPaymentInput) => void;
  paymentMethods: PaymentMethodResponse[];
}) {
  const maxAmountCents = Math.max(order.balanceDueCents, 0);
  const suggestedAmountCents = maxAmountCents > 0 ? maxAmountCents : order.totalAmountCents;
  const [amountRub, setAmountRub] = useState(centsToRubInput(suggestedAmountCents));
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountCents = rubToCents(amountRub);

  function confirmPayment() {
    if (!paymentMethodId) {
      setError("Выбери способ оплаты.");
      return;
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Укажи положительную сумму оплаты.");
      return;
    }

    if (amountCents > maxAmountCents) {
      setError("Оплата не может быть больше остатка по заказу.");
      return;
    }

    onConfirm({
      amountCents,
      paymentMethodId,
      comment: comment.trim() || undefined
    });
  }

  return (
    <ConfirmDialog
      confirmLabel={amountCents > 0 && amountCents < order.balanceDueCents ? "Принять предоплату" : "Принять оплату"}
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={confirmPayment}
      title={order.paidAmountCents > 0 ? "Принять доплату по заказу?" : "Принять оплату по заказу?"}
    >
      <div className="grid gap-3">
        <p>
          Оплачено: <strong className="text-white">{money(order.paidAmountCents)}</strong>. Остаток:{" "}
          <strong className="text-white">{money(order.balanceDueCents)}</strong>.
        </p>
        <TextField
          inputMode="decimal"
          label="Сумма оплаты, ₽"
          onChange={(event) => {
            setAmountRub(event.target.value);
            setError(null);
          }}
          value={amountRub}
        />
        <SelectField
          label="Способ оплаты"
          onChange={(event) => {
            setPaymentMethodId(event.target.value);
            setError(null);
          }}
          value={paymentMethodId}
        >
          <option value="">Выбери способ</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Комментарий" onChange={(event) => setComment(event.target.value)} value={comment} />
        <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
          <p className="text-white">{displayOrderNumber(order.orderNumber)}</p>
          <p className="mt-1 text-white/55">{order.customerName ?? "Клиент не указан"}</p>
        </div>
        {Number.isFinite(amountCents) && amountCents > 0 && amountCents < order.balanceDueCents ? (
          <p className="rounded-lg bg-amber/10 p-3 text-amber ring-1 ring-amber/20">
            Это будет предоплата. Заказ останется частично оплаченным до финальной доплаты.
          </p>
        ) : null}
        {error ? <p className="text-sm text-coral">{error}</p> : null}
      </div>
    </ConfirmDialog>
  );
}
