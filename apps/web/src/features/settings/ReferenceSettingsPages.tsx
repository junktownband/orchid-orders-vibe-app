import { Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  ExpenseCategoryListResponse,
  ExpenseCategoryResponse,
  PaymentMethodListResponse,
  PaymentMethodResponse
} from "@orchid/shared";

import { authHeaders, type Navigate, request } from "../../app/app-core";
import { ConfirmDialog, GhostButton, GlassPanel, PageToolbar, PrimaryButton, TextField } from "../../app/ui";

type ReferenceKind = "payment-methods" | "expense-categories";
type ReferenceItem = PaymentMethodResponse | ExpenseCategoryResponse;
type DraftReferenceItem = {
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: string;
};

const defaultsByKind = {
  "payment-methods": {
    title: "Способы оплаты",
    subtitle: "В оплатах заказов и расходах используются только Наличные и Перевод.",
    createLabel: "Добавить разрешенный способ",
    placeholder: "Наличные или Перевод"
  },
  "expense-categories": {
    title: "Категории расходов",
    subtitle: "Категории используются только для обычных расходов. Налоги и зарплаты создаются системно.",
    createLabel: "Новая категория",
    placeholder: "Например, Материалы"
  }
} satisfies Record<ReferenceKind, { title: string; subtitle: string; createLabel: string; placeholder: string }>;

function isExpenseCategory(item: ReferenceItem): item is ExpenseCategoryResponse {
  return "color" in item;
}

function draftFromItem(item: ReferenceItem): DraftReferenceItem {
  return {
    name: item.name,
    color: isExpenseCategory(item) ? (item.color ?? "") : "",
    isActive: item.isActive,
    sortOrder: String(item.sortOrder)
  };
}

function sortOrderFrom(value: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 100;
}

export function ReferenceSettingsPage({
  accessToken,
  kind,
  navigate
}: {
  accessToken: string;
  kind: ReferenceKind;
  navigate: Navigate;
}) {
  const meta = defaultsByKind[kind];
  const endpoint = `/api/v1/settings/${kind}`;
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftReferenceItem>>({});
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#7dd3fc");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState<ReferenceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCategoryPage = kind === "expense-categories";

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);

    return request<PaymentMethodListResponse | ExpenseCategoryListResponse>(endpoint, {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        setItems(response.items);
        setDrafts(Object.fromEntries(response.items.map((item) => [item.id, draftFromItem(item)])));
      })
      .catch(() => setError("Не удалось загрузить справочник."))
      .finally(() => setIsLoading(false));
  }, [accessToken, endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function updateDraft(id: string, patch: Partial<DraftReferenceItem>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch
      }
    }));
  }

  async function createItem() {
    if (!newName.trim()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await request<ReferenceItem>(endpoint, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name: newName,
          color: isCategoryPage ? newColor : undefined
        })
      });
      setNewName("");
      await refresh();
    } catch {
      setError("Не удалось добавить запись. Проверьте уникальность названия.");
    } finally {
      setIsCreating(false);
    }
  }

  async function persistItem(item: ReferenceItem) {
    const draft = drafts[item.id];

    if (!draft) {
      return;
    }

    setSavingId(item.id);
    setError(null);

    try {
      const updated = await request<ReferenceItem>(`${endpoint}/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name: draft.name,
          color: isCategoryPage ? draft.color || null : undefined,
          isActive: draft.isActive,
          sortOrder: sortOrderFrom(draft.sortOrder)
        })
      });
      setItems((current) =>
        current
          .map((currentItem) => (currentItem.id === updated.id ? updated : currentItem))
          .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
      );
      setDrafts((current) => ({
        ...current,
        [updated.id]: draftFromItem(updated)
      }));
    } catch {
      setError("Не удалось сохранить запись.");
    } finally {
      setSavingId(null);
    }
  }

  function saveItem(item: ReferenceItem) {
    const draft = drafts[item.id];

    if (item.isActive && draft && !draft.isActive) {
      setItemToDeactivate(item);
      return;
    }

    void persistItem(item);
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "settings", view: "profile" })} count={items.length} title={meta.title} />
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">{meta.createLabel}</p>
          <h3 className="mt-1 text-2xl font-semibold">Добавить</h3>
          <p className="mt-2 text-sm leading-6 text-white/55">{meta.subtitle}</p>
          <div className="mt-5 grid gap-3">
            <TextField label="Название" onChange={(event) => setNewName(event.target.value)} placeholder={meta.placeholder} value={newName} />
            {isCategoryPage ? (
              <div className="grid gap-2">
                <TextField label="Цвет" onChange={(event) => setNewColor(event.target.value)} value={newColor} />
                <span className="h-3 rounded-full" style={{ backgroundColor: newColor }} />
              </div>
            ) : null}
            <PrimaryButton disabled={isCreating || !newName.trim()} onClick={() => void createItem()} type="button">
              <Plus size={17} />
              {isCreating ? "Добавляем..." : "Добавить"}
            </PrimaryButton>
            {error ? <p className="text-sm text-coral">{error}</p> : null}
          </div>
        </GlassPanel>

        <div className="grid gap-3">
          {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем справочник...</p> : null}
          {!isLoading && items.length === 0 ? (
            <GlassPanel className="p-5">
              <p className="text-white/62">Записей пока нет.</p>
            </GlassPanel>
          ) : null}
          {items.map((item) => {
            const draft = drafts[item.id] ?? draftFromItem(item);

            return (
              <GlassPanel key={item.id} as="article" className="p-4">
                <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
                  <div className={`grid gap-3 ${isCategoryPage ? "sm:grid-cols-[1fr_140px_120px]" : "sm:grid-cols-[1fr_120px]"}`}>
                    <TextField label="Название" onChange={(event) => updateDraft(item.id, { name: event.target.value })} value={draft.name} />
                    {isCategoryPage ? (
                      <TextField label="Цвет" onChange={(event) => updateDraft(item.id, { color: event.target.value })} value={draft.color} />
                    ) : null}
                    <TextField
                      inputMode="numeric"
                      label="Порядок"
                      onChange={(event) => updateDraft(item.id, { sortOrder: event.target.value })}
                      value={draft.sortOrder}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <label className="inline-flex h-11 items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3 text-sm text-white/62 shadow-inner-glass">
                      <input
                        checked={draft.isActive}
                        className="h-4 w-4 accent-mint"
                        onChange={(event) => updateDraft(item.id, { isActive: event.target.checked })}
                        type="checkbox"
                      />
                      Активен
                    </label>
                    {isCategoryPage && draft.color ? (
                      <span
                        aria-hidden="true"
                        className="h-11 w-11 rounded-md border border-white/10 shadow-inner-glass"
                        style={{ backgroundColor: draft.color }}
                      />
                    ) : null}
                    <GhostButton disabled={savingId === item.id || !draft.name.trim()} onClick={() => saveItem(item)} type="button">
                      <Save size={16} />
                      {savingId === item.id ? "Сохраняем..." : "Сохранить"}
                    </GhostButton>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </div>
      {itemToDeactivate ? (
        <ConfirmDialog
          confirmLabel={isCategoryPage ? "Отключить категорию" : "Отключить способ оплаты"}
          destructive
          isBusy={savingId === itemToDeactivate.id}
          onCancel={() => setItemToDeactivate(null)}
          onConfirm={() => {
            const item = itemToDeactivate;
            setItemToDeactivate(null);
            void persistItem(item);
          }}
          title={isCategoryPage ? "Отключить категорию расходов?" : "Отключить способ оплаты?"}
        >
          <p>Запись останется в истории, но пропадет из новых операций и фильтров.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
