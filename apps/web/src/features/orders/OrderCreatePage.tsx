import { Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import type { MasterListResponse, RepairOrderResponse, ServiceCatalogItemResponse, ServiceCatalogListResponse } from "@orchid/shared";

import {
  authHeaders,
  buildRepairOrderItemsPayload,
  calculateDraftTotals,
  centsToRubInput,
  createDraftItem,
  draftItemNameLabel,
  draftItemPriceLabel,
  errorMessage,
  fieldError,
  fieldErrorMap,
  filterCatalogItems,
  fixedServiceTypes,
  formatPhoneInput,
  isCatalogServiceItem,
  isServiceItem,
  money,
  parsedMoneyOrZero,
  quickOrderItems,
  request,
  resaleTypes,
  serviceTypeLabel,
  type DraftOrderItem,
  type OrderWarning,
  type Screen
} from "../../app/app-core";
import {
  GhostButton,
  GlassPanel,
  MarginPreview,
  PageToolbar,
  PrimaryButton,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField,
  WarningPill
} from "../../app/ui";

export function OrderCreatePage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [masters, setMasters] = useState<MasterListResponse["items"]>([]);
  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItemResponse[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [instrumentName, setInstrumentName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedMasterId, setAssignedMasterId] = useState("");
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const headers = authHeaders(accessToken);

    Promise.all([
      request<MasterListResponse>("/api/v1/repair-orders/masters", { headers }),
      request<ServiceCatalogListResponse>("/api/v1/service-catalog", { headers })
    ])
      .then(([mastersResponse, catalogResponse]) => {
        setMasters(mastersResponse.items);
        setCatalogItems(catalogResponse.items.filter((item) => item.isActive && fixedServiceTypes.has(item.type)));
      })
      .catch(() => {
        setMasters([]);
        setCatalogItems([]);
      });
  }, [accessToken]);

  const draftTotals = useMemo(() => calculateDraftTotals(draftItems), [draftItems]);
  const foundCatalogItems = useMemo(() => filterCatalogItems(catalogItems, serviceQuery), [catalogItems, serviceQuery]);

  function updateDraftItem(localId: string, patch: Partial<DraftOrderItem>) {
    setDraftItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  function removeDraftItem(localId: string) {
    setDraftItems((current) => current.filter((item) => item.localId !== localId));
  }

  function addCatalogItem(item: ServiceCatalogItemResponse) {
    setDraftItems((current) => [
      ...current,
      createDraftItem({
        serviceCatalogItemId: item.id,
        assignedMasterMembershipId: item.type === "SERVICE" ? assignedMasterId || null : null,
        name: item.name,
        type: item.type,
        priceRub: centsToRubInput(item.defaultPriceCents),
        costRub: centsToRubInput(item.defaultCostCents)
      })
    ]);
    setServiceQuery("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsCreating(true);

    try {
      if (draftItems.length === 0) {
        throw new Error("Empty items");
      }

      await request<RepairOrderResponse>("/api/v1/repair-orders", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          customer: {
            name: customerName,
            phone: customerPhone || undefined
          },
          instrument: instrumentName
            ? {
                type: "guitar",
                model: instrumentName
              }
            : undefined,
          description,
          assignedMasterMembershipId: assignedMasterId || undefined,
          items: buildRepairOrderItemsPayload(draftItems)
        })
      });

      navigate({ section: "orders", view: "list" });
    } catch (requestError) {
      const errors = fieldErrorMap(requestError);

      setFieldErrors({
        customerName: fieldError(errors, ["customer.name", "name"]),
        customerPhone: fieldError(errors, ["customer.phone", "phone"]),
        description: fieldError(errors, ["description"]),
        items: fieldError(errors, ["items"])
      });
      setError(errorMessage(requestError, "Не удалось создать заказ. Проверьте поля."));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "orders", view: "list" })} title="Новый заказ" />
      <form className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]" onSubmit={handleCreate}>
        <GlassPanel className="grid content-start gap-4 overflow-hidden p-5">
          <div className="relative grid gap-4">
            <TextField
              autoComplete="name"
              error={fieldErrors.customerName}
              label="Клиент"
              onChange={(event) => setCustomerName(event.target.value)}
              value={customerName}
            />
            <TextField
              autoComplete="tel"
              error={fieldErrors.customerPhone}
              inputMode="tel"
              label="Телефон"
              onChange={(event) => setCustomerPhone(formatPhoneInput(event.target.value))}
              placeholder="+7 (999) 123-45-67"
              type="tel"
              value={customerPhone}
            />
            <TextField
              label="Инструмент"
              onChange={(event) => setInstrumentName(event.target.value)}
              value={instrumentName}
            />
            <TextAreaField
              error={fieldErrors.description}
              label="Описание работ"
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              value={description}
            />
            <SelectField
              label="Ответственный"
              onChange={(event) => setAssignedMasterId(event.target.value)}
              value={assignedMasterId}
            >
              <option value="">Ответственный не выбран</option>
              {masters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.name}
                </option>
              ))}
            </SelectField>
          </div>
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-5">
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Позиции заказа</h3>
            </div>
            <div className="mt-4 grid gap-3 rounded-lg bg-white/[0.045] p-3 shadow-inner-glass ring-1 ring-white/[0.08]">
              <TextField
                label="Поиск стандартной услуги"
                onChange={(event) => setServiceQuery(event.target.value)}
                placeholder="Проточка, порожек, отстройка..."
                value={serviceQuery}
              />
              {foundCatalogItems.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {foundCatalogItems.map((item) => (
                    <button
                      key={item.id}
                      className="rounded-md border border-white/10 bg-white/[0.055] px-3 py-3 text-left text-sm text-white shadow-inner-glass transition-[background-color,border-color,box-shadow] hover:border-mint/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/25"
                      onClick={() => addCatalogItem(item)}
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
                  onClick={() =>
                    setDraftItems((current) => [
                      ...current,
                      createDraftItem({
                        ...quickItem.item,
                        assignedMasterMembershipId:
                          quickItem.item.type === "SERVICE" ? assignedMasterId || null : null
                      })
                    ])
                  }
                  type="button"
                >
                  {quickItem.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <MarginPreview
                costCents={draftTotals.costCents}
                priceCents={draftTotals.priceCents}
                subtitle={`${draftItems.length} позиций`}
                title="Итог заказа"
              />
            </div>

            <div className="mt-4 grid gap-3">
              {draftItems.map((item) => {
                const linePriceCents = parsedMoneyOrZero(item.priceRub);
                const lineCostCents = parsedMoneyOrZero(item.costRub || "0");
                const lineProfitCents = linePriceCents - lineCostCents;
                const draftWarnings: OrderWarning[] = [
                  ...(resaleTypes.has(item.type) && linePriceCents > 0 && lineCostCents === 0
                    ? [{ tone: "amber" as const, text: "Себестоимость не заполнена" }]
                    : []),
                  ...(lineProfitCents < 0 ? [{ tone: "coral" as const, text: "Маржа ниже нуля" }] : [])
                ];
                const isStandardService = isCatalogServiceItem(item);
                const isService = isServiceItem(item);

                if (isStandardService) {
                  return (
                    <div
                      key={item.localId}
                      className="grid gap-4 rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <StatusPill label="Стандартная услуга" tone="mint" />
                          <h4 className="mt-1 font-semibold text-white">{item.name}</h4>
                        </div>
                        <GhostButton
                          aria-label={`Удалить позицию ${item.name}`}
                          className="h-11 px-0 text-coral sm:w-11"
                          onClick={() => removeDraftItem(item.localId)}
                          type="button"
                        >
                          <Trash2 size={16} />
                        </GhostButton>
                      </div>
                      <div className="grid gap-3 rounded-lg bg-white/[0.05] p-3 ring-1 ring-white/[0.08] sm:grid-cols-3">
                        <TextField
                          inputMode="decimal"
                          label={draftItemPriceLabel(item)}
                          onChange={(event) => updateDraftItem(item.localId, { priceRub: event.target.value })}
                          value={item.priceRub}
                        />
                        <TextField
                          inputMode="decimal"
                          label="Себестоимость, ₽"
                          onChange={(event) => updateDraftItem(item.localId, { costRub: event.target.value })}
                          value={item.costRub}
                        />
                        <SelectField
                          label="Мастер услуги"
                          onChange={(event) =>
                            updateDraftItem(item.localId, { assignedMasterMembershipId: event.target.value || null })
                          }
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
                  <div
                    key={item.localId}
                    className="grid gap-4 rounded-lg bg-black/15 p-4 shadow-inner-glass ring-1 ring-white/[0.08]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <StatusPill label={serviceTypeLabel(item.type)} tone={isService ? "mint" : "amber"} />
                        <p className="mt-2 text-sm text-white/48">
                          {isService ? "Описываем работу и цену." : "Указываем позицию и ее закупочную цену."}
                        </p>
                      </div>
                      <GhostButton
                        aria-label={`Удалить позицию ${item.name || serviceTypeLabel(item.type)}`}
                        className="h-11 px-0 text-coral sm:w-11"
                        onClick={() => removeDraftItem(item.localId)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </GhostButton>
                    </div>
                    <div className="rounded-lg bg-white/[0.05] p-3 ring-1 ring-white/[0.08]">
                      <TextField
                        label={draftItemNameLabel(item)}
                        onChange={(event) => updateDraftItem(item.localId, { name: event.target.value })}
                        value={item.name}
                      />
                    </div>
                    <div className={`grid gap-3 ${isService ? "" : "sm:grid-cols-2"}`}>
                      <TextField
                        inputMode="decimal"
                        label={draftItemPriceLabel(item)}
                        onChange={(event) => updateDraftItem(item.localId, { priceRub: event.target.value })}
                        value={item.priceRub}
                      />
                      {resaleTypes.has(item.type) ? (
                        <TextField
                          inputMode="decimal"
                          label="Себестоимость, ₽"
                          onChange={(event) => updateDraftItem(item.localId, { costRub: event.target.value })}
                          value={item.costRub}
                        />
                      ) : null}
                      {isService ? (
                        <SelectField
                          label="Мастер услуги"
                          onChange={(event) =>
                            updateDraftItem(item.localId, { assignedMasterMembershipId: event.target.value || null })
                          }
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
                    {draftWarnings.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {draftWarnings.map((warning) => (
                          <WarningPill key={warning.text} warning={warning} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
            <PrimaryButton className="mt-4 w-full" disabled={isCreating} type="submit">
              {isCreating ? "Создаем..." : "Создать заказ"}
            </PrimaryButton>
          </div>
        </GlassPanel>
      </form>
    </div>
  );
}
