import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import type { ServiceCatalogItemResponse, ServiceCatalogListResponse } from "@orchid/shared";

import {
  authHeaders,
  centsToRubInput,
  fixedServiceTypes,
  money,
  parsedMoneyOrZero,
  request,
  rubToCents,
  type Screen
} from "../../app/app-core";
import { ConfirmDialog, GhostButton, GlassPanel, InlineStat, MetricCard, PageToolbar, PrimaryButton, StatusPill, TextField } from "../../app/ui";

function ServiceCatalogItemCard({
  accessToken,
  item,
  onUpdated
}: {
  accessToken: string;
  item: ServiceCatalogItemResponse;
  onUpdated: (item: ServiceCatalogItemResponse) => void;
}) {
  const [name, setName] = useState(item.name);
  const [priceRub, setPriceRub] = useState(centsToRubInput(item.defaultPriceCents));
  const [costRub, setCostRub] = useState(centsToRubInput(item.defaultCostCents));
  const [isSaving, setIsSaving] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewPriceCents = parsedMoneyOrZero(priceRub);
  const previewCostCents = parsedMoneyOrZero(costRub);
  const grossProfitCents = previewPriceCents - previewCostCents;

  useEffect(() => {
    setName(item.name);
    setPriceRub(centsToRubInput(item.defaultPriceCents));
    setCostRub(centsToRubInput(item.defaultCostCents));
    setError(null);
  }, [item.defaultCostCents, item.defaultPriceCents, item.name]);

  async function patchService(body: Record<string, unknown>) {
    const updated = await request<ServiceCatalogItemResponse>(`/api/v1/service-catalog/${item.id}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body)
    });

    onUpdated(updated);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const defaultPriceCents = rubToCents(priceRub);
      const defaultCostCents = costRub.trim() ? rubToCents(costRub) : 0;

      if (
        name.trim().length < 2 ||
        !Number.isFinite(defaultPriceCents) ||
        defaultPriceCents <= 0 ||
        !Number.isFinite(defaultCostCents) ||
        defaultCostCents < 0
      ) {
        throw new Error("Invalid service data");
      }

      await patchService({
        name,
        defaultPriceCents,
        defaultCostCents
      });
    } catch {
      setError("Не удалось сохранить услугу. Проверьте название, цену и себестоимость.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleActive() {
    setError(null);
    setIsSaving(true);

    try {
      await patchService({
        isActive: !item.isActive
      });
    } catch {
      setError(item.isActive ? "Не удалось отключить услугу." : "Не удалось включить услугу.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GlassPanel as="article" className="grid gap-4 p-4 xl:grid-cols-[1fr_1.1fr] xl:items-start">
      <form className="grid gap-3" onSubmit={(event) => void saveService(event)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill label={item.isActive ? "Активна" : "Отключена"} tone={item.isActive ? "mint" : "neutral"} />
          <GhostButton
            className="h-9 px-3"
            disabled={isSaving}
            onClick={() => (item.isActive ? setShowDeactivateConfirm(true) : void toggleActive())}
            type="button"
          >
            {item.isActive ? "Отключить" : "Включить"}
          </GhostButton>
        </div>
        <TextField label="Название" onChange={(event) => setName(event.target.value)} value={name} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            inputMode="decimal"
            label="Цена клиенту, ₽"
            onChange={(event) => setPriceRub(event.target.value)}
            value={priceRub}
          />
          <TextField
            inputMode="decimal"
            label="Базовая себестоимость, ₽"
            onChange={(event) => setCostRub(event.target.value)}
            value={costRub}
          />
        </div>
        <p className="text-sm leading-6 text-white/45">
          Цена и базовая себестоимость копируются в заказ. Отключенная услуга остается в истории, но не предлагается в новых заказах.
        </p>
        {error ? <p className="text-sm text-coral">{error}</p> : null}
        <PrimaryButton disabled={isSaving} type="submit">
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </PrimaryButton>
      </form>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricCard label="Цена" tone="text-mint" value={money(previewPriceCents)} />
        <MetricCard label="Себестоимость" value={money(previewCostCents)} />
        <MetricCard
          label="База до налога"
          tone={grossProfitCents < 0 ? "text-coral" : "text-lime-200"}
          value={money(grossProfitCents)}
        />
      </div>
      {showDeactivateConfirm ? (
        <ConfirmDialog
          confirmLabel="Отключить услугу"
          destructive
          isBusy={isSaving}
          onCancel={() => setShowDeactivateConfirm(false)}
          onConfirm={() => {
            setShowDeactivateConfirm(false);
            void toggleActive();
          }}
          title="Отключить услугу?"
        >
          <p>Услуга останется в истории старых заказов, но пропадет из выбора при создании новых заказов.</p>
        </ConfirmDialog>
      ) : null}
    </GlassPanel>
  );
}

export function ServicesListPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [items, setItems] = useState<ServiceCatalogItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    request<ServiceCatalogListResponse>("/api/v1/service-catalog", {
      headers: authHeaders(accessToken)
    })
      .then((response) => setItems(response.items.filter((item) => fixedServiceTypes.has(item.type))))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  return (
    <div>
      <PageToolbar
        action={
          <PrimaryButton onClick={() => navigate({ section: "settings", view: "service-create" })}>
            <Plus size={17} />
            Добавить
          </PrimaryButton>
        }
        back={() => navigate({ section: "settings", view: "profile" })}
        count={items.length}
        title="Каталог услуг"
      />

      <div className="grid gap-3">
        {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем справочник...</p> : null}
        {!isLoading && items.length === 0 ? (
          <GlassPanel className="p-5">
            <p className="text-white/62">Фиксированных услуг пока нет.</p>
          </GlassPanel>
        ) : null}
        {items.map((item) => (
          <ServiceCatalogItemCard
            key={item.id}
            accessToken={accessToken}
            item={item}
            onUpdated={(updated) =>
              setItems((current) => current.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem)))
            }
          />
        ))}
      </div>
    </div>
  );
}

export function ServiceCreatePage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [name, setName] = useState("");
  const [priceRub, setPriceRub] = useState("");
  const [costRub, setCostRub] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewPriceCents = parsedMoneyOrZero(priceRub);
  const previewCostCents = parsedMoneyOrZero(costRub);
  const previewProfitCents = previewPriceCents - previewCostCents;

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const defaultPriceCents = rubToCents(priceRub);
      const defaultCostCents = costRub.trim() ? rubToCents(costRub) : 0;

      if (
        !Number.isFinite(defaultPriceCents) ||
        defaultPriceCents <= 0 ||
        !Number.isFinite(defaultCostCents) ||
        defaultCostCents < 0
      ) {
        throw new Error("Invalid service price or cost");
      }

      await request<ServiceCatalogItemResponse>("/api/v1/service-catalog", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name,
          type: "SERVICE",
          defaultPriceCents,
          defaultCostCents
        })
      });

      navigate({ section: "settings", view: "services" });
    } catch {
      setError("Не удалось добавить услугу. Проверьте название, цену и себестоимость.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "settings", view: "services" })} title="Новая услуга" />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <GlassPanel className="overflow-hidden p-5">
          <form className="relative grid gap-4" onSubmit={handleCreateService}>
            <TextField label="Название" onChange={(event) => setName(event.target.value)} value={name} />
            <TextField
              inputMode="decimal"
              label="Цена клиенту, ₽"
              onChange={(event) => setPriceRub(event.target.value)}
              value={priceRub}
            />
            <TextField
              inputMode="decimal"
              label="Базовая себестоимость, ₽"
              onChange={(event) => setCostRub(event.target.value)}
              value={costRub}
            />
            <p className="rounded-lg bg-white/[0.055] p-3 text-sm leading-6 text-white/55 ring-1 ring-white/[0.08]">
              Значения по умолчанию для цены и себестоимости в заказах.
            </p>
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton disabled={isSaving} type="submit">
              {isSaving ? "Добавляем..." : "Добавить услугу"}
            </PrimaryButton>
          </form>
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-5">
          <div className="relative">
            <p className="text-sm text-white/48">Предпросмотр</p>
            <h3 className="mt-1 text-2xl font-semibold">Фиксированная услуга</h3>
            <div className="mt-5 grid gap-3">
              <InlineStat label="Цена клиенту" tone="text-mint" value={money(previewPriceCents)} />
              <InlineStat label="Базовая себестоимость" value={money(previewCostCents)} />
              <InlineStat
                label="База до налога"
                tone={previewProfitCents < 0 ? "text-coral" : "text-lime-200"}
                value={money(previewProfitCents)}
              />
              <div className="rounded-lg bg-amber/10 p-3 text-sm leading-6 text-amber ring-1 ring-amber/20">
                В заказе значения можно изменить вручную.
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
