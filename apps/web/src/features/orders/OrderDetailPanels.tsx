import { History, Trash2, WalletCards } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

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
  money,
  paymentStatusLabel,
  quickOrderItems,
  repairStatusLabel,
  repairStatusOptions,
  request,
  resaleTypes,
  serviceTypeLabel,
  shortId,
  rubToCents,
  type DraftOrderItem,
  type Screen
} from "../../app/app-core";
import {
  ConfirmDialog,
  GhostButton,
  GlassPanel,
  InlineStat,
  MarginPreview,
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

export function AuditTimelinePanel({ items, isLoading }: { items: AuditLogResponse[]; isLoading: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.045] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/48">История</p>
          <h3 className="mt-1 text-lg font-semibold">Журнал действий</h3>
        </div>
        <History aria-hidden="true" className="text-white/36" size={20} />
      </div>
      <div className="mt-4 grid gap-3">
        {isLoading ? <p className="text-sm text-white/50">Загружаем историю...</p> : null}
        {!isLoading && items.length === 0 ? <p className="text-sm text-white/50">Пока нет событий по заказу.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-md bg-white/[0.045] p-3 shadow-inner-glass ring-1 ring-white/[0.08]">
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
    </div>
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(order.customerName ?? "");
    setPhone(order.customerPhone ?? "");
    setEmail(order.customerEmail ?? "");
    setNote(order.customerNote ?? "");
    setError(null);
    setIsEditing(false);
  }, [order.customerEmail, order.customerName, order.customerNote, order.customerPhone, order.customerId]);

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order.customerId) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const customer = await request<CustomerResponse>(`/api/v1/customers/${order.customerId}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name,
          phone: phone || null,
          email: email || null,
          note: note || null
        })
      });

      onCustomerUpdated(customer);
      setIsEditing(false);
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось сохранить клиента."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.045] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
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
        <form className="mt-4 grid gap-3" onSubmit={(event) => void saveCustomer(event)}>
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
          <PrimaryButton disabled={isSaving || !name} type="submit">
            {isSaving ? "Сохраняем..." : "Сохранить клиента"}
          </PrimaryButton>
        </form>
      ) : null}
    </div>
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

  return (
    <GlassPanel className="grid content-start gap-4 p-5">
      <div>
        <p className="text-sm text-white/45">
          {displayOrderNumber(order.orderNumber)} · ID {shortId(order.id)}
        </p>
        <p className="mt-1 text-sm text-white/45">{order.customerName ?? "Клиент не указан"}</p>
        {order.customerPhone ? <p className="mt-1 text-sm text-white/45">{order.customerPhone}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold">{order.instrumentName || order.description}</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">{order.description}</p>
      </div>
      <div className="rounded-lg bg-white/[0.055] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
        <p className="text-sm text-white/48">Состояние заказа</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill label={repairStatusLabel(order.repairStatus)} tone={repairTone} />
          <StatusPill label={paymentStatusLabel(order.paymentStatus)} tone={paymentTone} />
        </div>
        <p className="mt-3 text-sm leading-6 text-white/55">
          {isIssued
            ? "Статус: выдан."
            : order.paymentStatus === "PAID"
              ? "Оплата принята. Требуется выдача."
              : "Требуется оплата или выдача."}
        </p>
      </div>
      <CustomerProfilePanel
        accessToken={accessToken}
        canEdit={canManageOrders}
        onCustomerUpdated={onCustomerUpdated}
        order={order}
      />
      <div className="grid gap-3">
        <InlineStat label="Создан" value={dateTime(order.createdAt)} />
        <InlineStat label="Закрыт" value={dateTime(order.issuedAt)} />
      </div>
      {canManageOrders ? (
        <div className="rounded-lg bg-white/[0.045] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
          <p className="text-sm text-white/48">Оплата</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <InlineStat label="Оплачено" tone="text-mint" value={money(order.paidAmountCents)} />
            <InlineStat label="Остаток" tone={order.balanceDueCents > 0 ? "text-amber" : "text-white"} value={money(order.balanceDueCents)} />
          </div>
          <div className="mt-3 grid gap-2">
            {order.payments.length === 0 ? <p className="text-sm text-white/45">Платежей пока нет.</p> : null}
            {order.payments.map((payment) => (
              <div key={payment.id} className="rounded-md bg-black/15 p-3 text-sm ring-1 ring-white/[0.08]">
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
        </div>
      ) : null}
      {canManageOrders ? <AuditTimelinePanel isLoading={isAuditLoading} items={auditItems} /> : null}
      {canManageOrders && !isIssued ? (
        <GhostButton onClick={() => navigate({ section: "expenses", view: "create", orderId: order.id })} type="button">
          <WalletCards size={17} />
          Расход к заказу
        </GhostButton>
      ) : null}
      {canManageOrders ? (
        <MarginPreview
          costCents={draftTotals.costCents}
          priceCents={draftTotals.priceCents}
          subtitle={`${draftItemsCount} позиций`}
          title="Итог заказа"
        />
      ) : null}
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
      {isIssued ? (
        <div className="rounded-lg bg-mint/10 p-3 text-sm text-mint ring-1 ring-mint/20">
          Заказ выдан и закрыт. Редактирование заблокировано.
        </div>
      ) : canManageOrders ? (
        <div className="grid gap-3 rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
          <div>
            <p className="text-sm text-white/48">Финальное действие</p>
            <p className="mt-1 text-sm leading-6 text-white/55">
              После выдачи заказ перейдет в закрытые, а позиции, оплата, статус и ответственный станут недоступны для изменений.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {order.paymentStatus !== "PAID" ? (
              <GhostButton disabled={isMarkingPaid} onClick={onPaymentRequested} type="button">
                {isMarkingPaid ? "Принимаем..." : order.paidAmountCents > 0 ? "Принять доплату" : "Принять оплату"}
              </GhostButton>
            ) : null}
            <PrimaryButton onClick={() => navigate({ section: "orders", view: "issue", orderId: order.id })} type="button">
              Выдать заказ
            </PrimaryButton>
          </div>
        </div>
      ) : null}
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
      <div key={item.localId} className="grid gap-4 rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <StatusPill label="Стандартная услуга" tone="mint" />
            <h4 className="mt-1 font-semibold text-white">{item.name}</h4>
          </div>
          <DraftItemActions isReadOnly={isReadOnly} item={item} navigate={navigate} onRemove={onRemove} order={order} />
        </div>
        <div className="grid gap-3 rounded-lg bg-white/[0.05] p-3 ring-1 ring-white/[0.08] sm:grid-cols-3">
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
    <div key={item.localId} className="grid gap-4 rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusPill label={serviceTypeLabel(item.type)} tone={isService ? "mint" : "amber"} />
          <p className="mt-2 text-sm text-white/48">
            {isService ? "Описываем работу и цену." : "Указываем позицию и сколько она нам стоит."}
          </p>
        </div>
        <DraftItemActions isReadOnly={isReadOnly} item={item} navigate={navigate} onRemove={onRemove} order={order} />
      </div>
      <div className="rounded-lg bg-white/[0.05] p-3 ring-1 ring-white/[0.08]">
        <TextField
          disabled={isReadOnly}
          label={draftItemNameLabel(item)}
          onChange={(event) => onUpdate(item.localId, { name: event.target.value })}
          value={item.name}
        />
      </div>
      <div className={`grid gap-3 ${isService ? "" : "sm:grid-cols-2"}`}>
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

export function OrderItemsPanel({
  canManageOrders,
  draftItems,
  error,
  foundCatalogItems,
  isReadOnly,
  isSaving,
  masters,
  navigate,
  order,
  serviceQuery,
  onAddCatalogItem,
  onAddQuickItem,
  onRemoveItem,
  onSaveItems,
  onServiceQueryChange,
  onUpdateItem
}: {
  canManageOrders: boolean;
  draftItems: DraftOrderItem[];
  error: string | null;
  foundCatalogItems: ServiceCatalogItemResponse[];
  isReadOnly: boolean;
  isSaving: boolean;
  masters: MasterListResponse["items"];
  navigate: (screen: Screen) => void;
  order: RepairOrderResponse;
  serviceQuery: string;
  onAddCatalogItem: (item: ServiceCatalogItemResponse) => void;
  onAddQuickItem: (item: Partial<DraftOrderItem>) => void;
  onRemoveItem: (localId: string) => void;
  onSaveItems: () => void;
  onServiceQueryChange: (value: string) => void;
  onUpdateItem: (localId: string, patch: Partial<DraftOrderItem>) => void;
}) {
  return (
    <GlassPanel className="overflow-hidden p-5">
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Позиции заказа</h3>
        </div>
        {canManageOrders ? (
          <>
            {!isReadOnly ? (
              <>
                <div className="mt-4 grid gap-3 rounded-lg bg-white/[0.045] p-3 shadow-inner-glass ring-1 ring-white/[0.08]">
                  <TextField
                    label="Поиск стандартной услуги"
                    onChange={(event) => onServiceQueryChange(event.target.value)}
                    placeholder="Проточка, порожек, отстройка..."
                    value={serviceQuery}
                  />
                  {foundCatalogItems.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {foundCatalogItems.map((item) => (
                        <button
                          key={item.id}
                          className="rounded-md border border-white/10 bg-white/[0.055] px-3 py-3 text-left text-sm text-white shadow-inner-glass transition-[background-color,border-color,box-shadow] hover:border-mint/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/25"
                          onClick={() => onAddCatalogItem(item)}
                          type="button"
                        >
                          <span className="block font-medium">{item.name}</span>
                          <span className="mt-1 block text-xs text-white/55">
                            {money(item.defaultPriceCents)} · себ. {money(item.defaultCostCents)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/45">Стандартная услуга не найдена.</p>
                  )}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {quickOrderItems.map((quickItem) => (
                    <button
                      key={quickItem.label}
                      className="rounded-md border border-white/10 bg-white/[0.055] px-3 py-3 text-left text-sm text-white shadow-inner-glass transition-[background-color,border-color,box-shadow] hover:border-mint/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/25"
                      onClick={() => onAddQuickItem(quickItem.item)}
                      type="button"
                    >
                      {quickItem.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
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
            </div>
            {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            {!isReadOnly ? (
              <PrimaryButton className="mt-4" disabled={isSaving} onClick={onSaveItems} type="button">
                {isSaving ? "Сохраняем..." : "Сохранить заказ"}
              </PrimaryButton>
            ) : null}
          </>
        ) : (
          <div className="mt-4 grid gap-3">
            {draftItems.map((item) => (
              <div key={item.localId} className="rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
                <StatusPill label={serviceTypeLabel(item.type)} tone={isServiceItem(item) ? "mint" : "amber"} />
                <h4 className="mt-2 font-semibold text-white">{item.name || serviceTypeLabel(item.type)}</h4>
              </div>
            ))}
          </div>
        )}
      </div>
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
