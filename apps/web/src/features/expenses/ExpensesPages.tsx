import { ChevronLeft, ChevronRight, Plus, RotateCcw, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import type {
  ExpenseListResponse,
  ExpenseResponse,
  ExpenseCategoryListResponse,
  PaymentMethodListResponse,
  RepairOrderResponse,
  RepairOrdersListResponse
} from "@orchid/shared";

import {
  authHeaders,
  dateTime,
  displayOrderNumber,
  errorMessage,
  money,
  orderSearchResultTitle,
  parsedMoneyOrZero,
  recentDateRange,
  request,
  rubToCents,
  type Screen
} from "../../app/app-core";
import {
  ConfirmDialog,
  GhostButton,
  GlassPanel,
  InlineStat,
  MetricCard,
  PageToolbar,
  PrimaryButton,
  SelectField,
  StatusPill,
  TextAreaField,
  TextField
} from "../../app/ui";

type ExpenseFilters = {
  from: string;
  to: string;
  createdByUserId: string;
  status: ExpenseResponse["status"] | "";
};

type ExpenseScope = "business" | "commissions" | "all";

const expenseScopeOptions: Array<{ value: ExpenseScope; label: string; detail: string }> = [
  { value: "business", label: "Расходы бизнеса", detail: "Без выплат мастерам" },
  { value: "commissions", label: "Комиссии мастерам", detail: "Только выплаты" },
  { value: "all", label: "Все", detail: "Расходы и комиссии" }
];

function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);

  return currentMonthValue(date);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));

  return label
    .replace(/\s?г\.$/u, "")
    .replace(/^./u, (letter) => letter.toLocaleUpperCase("ru-RU"));
}

function dateRangeForMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const from = `${value}-01`;
  const toDate = new Date(year, month, 0);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

  return { from, to };
}

function monthFromSearch(search: string) {
  const month = new URLSearchParams(search).get("month");

  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}

function expenseScopeFromSearch(search: string): ExpenseScope {
  const scope = new URLSearchParams(search).get("scope");

  return scope === "commissions" || scope === "all" ? scope : "business";
}

function defaultExpenseFilters(month?: string | null): ExpenseFilters {
  return {
    ...(month ? dateRangeForMonth(month) : recentDateRange(60)),
    createdByUserId: "",
    status: ""
  };
}

function expenseFiltersFromSearch(search: string): ExpenseFilters {
  const params = new URLSearchParams(search);
  const defaults = defaultExpenseFilters(monthFromSearch(search));
  const status = params.get("status");

  return {
    from: params.get("from") ?? defaults.from,
    to: params.get("to") ?? defaults.to,
    createdByUserId: params.get("createdByUserId") ?? "",
    status: status === "DRAFT" || status === "CONFIRMED" || status === "VOIDED" ? status : ""
  };
}

function searchForExpenseFilters(filters: ExpenseFilters, month?: string | null, scope: ExpenseScope = "business") {
  const params = new URLSearchParams();
  const monthRange = month ? dateRangeForMonth(month) : null;

  if (month) {
    params.set("month", month);
  }

  if (filters.from && (!monthRange || filters.from !== monthRange.from)) {
    params.set("from", filters.from);
  }

  if (filters.to && (!monthRange || filters.to !== monthRange.to)) {
    params.set("to", filters.to);
  }

  if (filters.createdByUserId) {
    params.set("createdByUserId", filters.createdByUserId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (scope !== "business") {
    params.set("scope", scope);
  }

  const search = params.toString();

  return search ? `?${search}` : "";
}

function pathForExpenseFilters(filters: ExpenseFilters) {
  const search = searchForExpenseFilters(filters, null);

  return `/api/v1/expenses${search}${search ? "&" : "?"}limit=160`;
}

function hasActiveExpenseFilters(filters: ExpenseFilters, defaults: ExpenseFilters) {
  return (
    filters.from !== defaults.from ||
    filters.to !== defaults.to ||
    filters.createdByUserId !== defaults.createdByUserId ||
    filters.status !== defaults.status
  );
}

function expenseKindLabel(kind: ExpenseResponse["kind"]) {
  if (kind === "TAX") {
    return "Налог";
  }

  if (kind === "SALARY") {
    return "Комиссия мастеру";
  }

  return "Расход";
}

function expenseStatusLabel(status: ExpenseResponse["status"]) {
  if (status === "CONFIRMED") {
    return "Подтвержден";
  }

  if (status === "VOIDED") {
    return "Отменен";
  }

  return "Черновик";
}

function expenseStatusTone(status: ExpenseResponse["status"]) {
  if (status === "CONFIRMED") {
    return "mint";
  }

  if (status === "VOIDED") {
    return "coral";
  }

  return "amber";
}

function expenseMatchesScope(expense: ExpenseResponse, scope: ExpenseScope) {
  if (scope === "business") {
    return expense.kind !== "SALARY";
  }

  if (scope === "commissions") {
    return expense.kind === "SALARY";
  }

  return true;
}

export function ExpensesListPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [authors, setAuthors] = useState<ExpenseListResponse["authors"]>([]);
  const [baseMonth, setBaseMonth] = useState(() => monthFromSearch(window.location.search));
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>(() => expenseScopeFromSearch(window.location.search));
  const [filters, setFilters] = useState<ExpenseFilters>(() => expenseFiltersFromSearch(window.location.search));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseToConfirm, setExpenseToConfirm] = useState<ExpenseResponse | null>(null);
  const [expenseToVoid, setExpenseToVoid] = useState<ExpenseResponse | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [confirmingExpenseId, setConfirmingExpenseId] = useState<string | null>(null);
  const [voidingExpenseId, setVoidingExpenseId] = useState<string | null>(null);
  const defaultFilters = useMemo(() => defaultExpenseFilters(baseMonth), [baseMonth]);
  const visibleExpenses = useMemo(
    () => expenses.filter((expense) => expenseMatchesScope(expense, expenseScope)),
    [expenseScope, expenses]
  );
  const scopeCounts = useMemo(
    () => ({
      business: expenses.filter((expense) => expense.kind !== "SALARY").length,
      commissions: expenses.filter((expense) => expense.kind === "SALARY").length,
      all: expenses.length
    }),
    [expenses]
  );

  function refresh(nextFilters = filters) {
    setIsLoading(true);
    setError(null);

    return request<ExpenseListResponse>(pathForExpenseFilters(nextFilters), {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        setExpenses(response.items);
        setAuthors(response.authors ?? []);
      })
      .catch((requestError) => {
        setExpenses([]);
        setAuthors([]);
        setError(errorMessage(requestError, "Не удалось загрузить расходы."));
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void refresh(filters);
  }, [accessToken]);

  useEffect(() => {
    function handlePopState() {
      setBaseMonth(monthFromSearch(window.location.search));
      setExpenseScope(expenseScopeFromSearch(window.location.search));
      const nextFilters = expenseFiltersFromSearch(window.location.search);

      setFilters(nextFilters);
      void refresh(nextFilters);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [accessToken]);

  function updateFilters(patch: Partial<ExpenseFilters>, nextBaseMonth = baseMonth) {
    setBaseMonth(nextBaseMonth);
    setFilters((current) => {
      const next = {
        ...current,
        ...patch
      };

      window.history.replaceState(null, "", `/money/expenses${searchForExpenseFilters(next, nextBaseMonth, expenseScope)}`);
      void refresh(next);

      return next;
    });
  }

  function updateMonth(nextMonth: string) {
    updateFilters(dateRangeForMonth(nextMonth), nextMonth);
  }

  function updateScope(nextScope: ExpenseScope) {
    setExpenseScope(nextScope);
    window.history.replaceState(null, "", `/money/expenses${searchForExpenseFilters(filters, baseMonth, nextScope)}`);
  }

  const totals = useMemo(
    () =>
      visibleExpenses.reduce(
        (sum, expense) => ({
          confirmed: sum.confirmed + (expense.status === "CONFIRMED" ? expense.amountCents : 0),
          draft: sum.draft + (expense.status === "DRAFT" ? expense.amountCents : 0),
          regular: sum.regular + (expense.status === "CONFIRMED" && expense.kind === "REGULAR" ? expense.amountCents : 0),
          tax: sum.tax + (expense.status === "CONFIRMED" && expense.kind === "TAX" ? expense.amountCents : 0),
          salary: sum.salary + (expense.status === "CONFIRMED" && expense.kind === "SALARY" ? expense.amountCents : 0)
        }),
        { confirmed: 0, draft: 0, regular: 0, tax: 0, salary: 0 }
      ),
    [visibleExpenses]
  );

  async function handleConfirm(expense: ExpenseResponse) {
    setError(null);
    setConfirmingExpenseId(expense.id);

    try {
      const updated = await request<ExpenseResponse>(`/api/v1/expenses/${expense.id}/confirm`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: "{}"
      });

      setExpenses((current) => current.map((currentExpense) => (currentExpense.id === updated.id ? updated : currentExpense)));
      setExpenseToConfirm(null);
    } catch {
      setError("Не удалось подтвердить расход. Обновите реестр.");
    } finally {
      setConfirmingExpenseId(null);
    }
  }

  async function handleVoid(expense: ExpenseResponse) {
    const reason = voidReason.trim();

    if (reason.length < 3) {
      setError("Укажи причину отмены расхода.");
      return;
    }

    setError(null);
    setVoidingExpenseId(expense.id);

    try {
      const updated = await request<ExpenseResponse>(`/api/v1/expenses/${expense.id}/void`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ reason })
      });

      setExpenses((current) => current.map((currentExpense) => (currentExpense.id === updated.id ? updated : currentExpense)));
      setExpenseToVoid(null);
      setVoidReason("");
    } catch {
      setError("Не удалось отменить расход. Обновите реестр.");
    } finally {
      setVoidingExpenseId(null);
    }
  }

  return (
    <div>
      <PageToolbar
        back={() => navigate({ section: "money", view: "overview", month: baseMonth ?? undefined })}
        action={
          <div className="flex items-center gap-2">
            <GhostButton
              aria-label="Обновить расходы"
              className="h-10 w-10 px-0"
              disabled={isLoading}
              onClick={() => void refresh()}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} />
            </GhostButton>
            <PrimaryButton onClick={() => navigate({ section: "money", view: "expense-create", month: baseMonth ?? undefined })}>
              <Plus size={17} />
              Новый расход
            </PrimaryButton>
          </div>
        }
        count={visibleExpenses.length}
        title="Расходы"
      />

      <GlassPanel className="mb-4 p-4">
        {baseMonth ? (
          <div className="mx-auto mb-4 grid w-full max-w-md grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
            <GhostButton aria-label="Предыдущий месяц" className="h-11 w-11 px-0" onClick={() => updateMonth(shiftMonth(baseMonth, -1))}>
              <ChevronLeft aria-hidden="true" size={18} />
            </GhostButton>
            <button
              className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.055] px-4 py-3 text-center text-lg font-semibold tracking-normal text-white shadow-inner-glass transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30"
              onClick={() => updateMonth(currentMonthValue())}
              type="button"
            >
              {monthLabel(baseMonth)}
            </button>
            <GhostButton aria-label="Следующий месяц" className="h-11 w-11 px-0" onClick={() => updateMonth(shiftMonth(baseMonth, 1))}>
              <ChevronRight aria-hidden="true" size={18} />
            </GhostButton>
          </div>
        ) : null}
        <div className="mb-4 grid gap-2 md:grid-cols-3">
          {expenseScopeOptions.map((option) => {
            const isActive = expenseScope === option.value;

            return (
              <button
                aria-label={option.label}
                aria-pressed={isActive}
                className={`rounded-lg border px-3 py-3 text-left transition-[background,border-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 ${
                  isActive
                    ? "border-mint/30 bg-mint/10 text-white"
                    : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/[0.16] hover:bg-white/[0.065] hover:text-white"
                }`}
                key={option.value}
                onClick={() => updateScope(option.value)}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm tabular-nums text-white/45">{scopeCounts[option.value]}</span>
                </span>
                <span className="mt-1 block text-xs text-white/42">{option.detail}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(140px,0.75fr)_minmax(140px,0.75fr)_minmax(180px,1fr)_minmax(150px,0.8fr)_auto]">
          <TextField
            label="С"
            onChange={(event) => updateFilters({ from: event.target.value }, null)}
            type="date"
            value={filters.from}
          />
          <TextField
            label="По"
            onChange={(event) => updateFilters({ to: event.target.value }, null)}
            type="date"
            value={filters.to}
          />
          <SelectField
            label="Кто внес"
            onChange={(event) => updateFilters({ createdByUserId: event.target.value })}
            value={filters.createdByUserId}
          >
            <option value="">Все авторы</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Статус"
            onChange={(event) => updateFilters({ status: event.target.value as ExpenseFilters["status"] })}
            value={filters.status}
          >
            <option value="">Все статусы</option>
            <option value="DRAFT">Черновик</option>
            <option value="CONFIRMED">Подтвержден</option>
            <option value="VOIDED">Отменен</option>
          </SelectField>
          <div className="flex items-end gap-2">
            <GhostButton className="h-11 w-full lg:w-11 lg:px-0" disabled={!hasActiveExpenseFilters(filters, defaultFilters)} onClick={() => updateFilters(defaultFilters)}>
              <X aria-hidden="true" size={16} />
              <span className="lg:sr-only">Сбросить</span>
            </GhostButton>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Подтверждено" tone="text-mint" value={money(totals.confirmed)} />
        <MetricCard label="Черновики" tone="text-amber" value={money(totals.draft)} />
        <MetricCard hint="Ручные расходы." label="Обычные" value={money(totals.regular)} />
        <MetricCard hint="Создаются при выдаче заказа." label="Налоги" tone="text-coral" value={money(totals.tax)} />
        <MetricCard hint="Создаются при выплате мастеру." label="Комиссии" tone="text-orchid" value={money(totals.salary)} />
      </div>

      <div className="mt-4 grid gap-3">
        {error ? <p className="rounded-lg bg-coral/12 p-4 text-coral">{error}</p> : null}
        {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем расходы...</p> : null}
        {!isLoading && visibleExpenses.length === 0 ? (
          <GlassPanel className="p-5">
            <p className="text-white/62">Расходов пока нет.</p>
          </GlassPanel>
        ) : null}
        {!isLoading && visibleExpenses.length > 0 ? (
          <GlassPanel className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                <thead className="bg-white/[0.045] text-xs uppercase tracking-normal text-white/42">
                  <tr>
                    <th className="px-4 py-3 font-medium">Дата</th>
                    <th className="px-4 py-3 font-medium">Расход</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Тип</th>
                    <th className="px-4 py-3 font-medium">Внес</th>
                    <th className="px-4 py-3 font-medium">Связь</th>
                    <th className="px-4 py-3 font-medium">Оплата</th>
                    <th className="px-4 py-3 text-right font-medium">Сумма</th>
                    <th className="px-4 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {visibleExpenses.map((expense) => (
                    <tr key={expense.id} className="align-top transition-colors hover:bg-white/[0.035]">
                      <td className="px-4 py-3 text-white/55">{dateTime(expense.spentAt)}</td>
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="font-medium text-white">{expense.description}</p>
                        {expense.categoryName ? <p className="mt-1 text-xs text-white/45">{expense.categoryName}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill label={expenseStatusLabel(expense.status)} tone={expenseStatusTone(expense.status)} />
                      </td>
                      <td className="px-4 py-3 text-white/62">{expenseKindLabel(expense.kind)}</td>
                      <td className="px-4 py-3 text-white/62">{expense.createdByName ?? "Не указан"}</td>
                      <td className="px-4 py-3 text-white/62">
                        {expense.repairOrderNumber ? (
                          <>
                            <span>{displayOrderNumber(expense.repairOrderNumber)}</span>
                            {expense.repairOrderItemName ? <span className="block text-xs text-white/42">{expense.repairOrderItemName}</span> : null}
                          </>
                        ) : (
                          "Общий расход"
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/62">{expense.paymentMethodName ?? "Не указан"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">{money(expense.amountCents)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {expense.status === "DRAFT" ? (
                            <PrimaryButton
                              className="h-9 px-3"
                              disabled={confirmingExpenseId === expense.id}
                              onClick={() => setExpenseToConfirm(expense)}
                            >
                              {confirmingExpenseId === expense.id ? "Подтверждаем..." : "Подтвердить"}
                            </PrimaryButton>
                          ) : null}
                          {expense.kind === "REGULAR" && expense.status !== "VOIDED" ? (
                            <GhostButton
                              className="h-9 px-3 text-coral"
                              disabled={voidingExpenseId === expense.id}
                              onClick={() => {
                                setExpenseToVoid(expense);
                                setVoidReason("");
                              }}
                            >
                              {voidingExpenseId === expense.id ? "Отменяем..." : "Отменить"}
                            </GhostButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        ) : null}
        {visibleExpenses.map((expense) => (
          <GlassPanel key={expense.id} as="article" className="p-4 lg:hidden">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-medium">{expense.description}</h3>
                  <StatusPill label={expenseStatusLabel(expense.status)} tone={expenseStatusTone(expense.status)} />
                  <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-white/55 ring-1 ring-white/10">
                    {expenseKindLabel(expense.kind)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/45">
                  {expense.repairOrderNumber ? `Заказ ${displayOrderNumber(expense.repairOrderNumber)}` : "Общий расход"}
                  {expense.repairOrderItemName ? ` · ${expense.repairOrderItemName}` : ""}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {dateTime(expense.spentAt)} · внес {expense.createdByName ?? "не указан"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {expense.categoryName ? (
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-white/62 ring-1 ring-white/10">
                      {expense.categoryName}
                    </span>
                  ) : null}
                  {expense.paymentMethodName ? (
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-white/62 ring-1 ring-white/10">
                      {expense.paymentMethodName}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <p className="text-2xl font-semibold">{money(expense.amountCents)}</p>
                {expense.status === "DRAFT" ? (
                  <PrimaryButton
                    disabled={confirmingExpenseId === expense.id}
                    onClick={() => setExpenseToConfirm(expense)}
                  >
                    {confirmingExpenseId === expense.id ? "Подтверждаем..." : "Подтвердить"}
                  </PrimaryButton>
                ) : null}
                {expense.kind === "REGULAR" && expense.status !== "VOIDED" ? (
                  <GhostButton
                    className="text-coral"
                    disabled={voidingExpenseId === expense.id}
                    onClick={() => {
                      setExpenseToVoid(expense);
                      setVoidReason("");
                    }}
                  >
                    {voidingExpenseId === expense.id ? "Отменяем…" : "Отменить"}
                  </GhostButton>
                ) : null}
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
      {expenseToConfirm ? (
        <ConfirmDialog
          confirmLabel="Подтвердить расход"
          destructive
          isBusy={confirmingExpenseId === expenseToConfirm.id}
          onCancel={() => setExpenseToConfirm(null)}
          onConfirm={() => void handleConfirm(expenseToConfirm)}
          title="Подтвердить расход?"
        >
          <div className="grid gap-3">
            <p>
              Сумма <strong className="text-white">{money(expenseToConfirm.amountCents)}</strong> попадет в финансовую
              аналитику.
            </p>
            <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
              <p className="text-white">{expenseToConfirm.description}</p>
              <p className="mt-1 text-white/55">
                {expenseToConfirm.repairOrderNumber
                  ? `Заказ ${displayOrderNumber(expenseToConfirm.repairOrderNumber)}`
                  : "Общий расход"}
                {expenseToConfirm.repairOrderItemName ? ` · ${expenseToConfirm.repairOrderItemName}` : ""}
              </p>
            </div>
            {expenseToConfirm.repairOrderItemName ? (
              <p className="rounded-lg bg-amber/10 p-3 text-amber ring-1 ring-amber/20">
                Расходник увеличит сумму заказа для клиента. Комиссия мастера считается после себестоимости.
              </p>
            ) : null}
          </div>
        </ConfirmDialog>
      ) : null}
      {expenseToVoid ? (
        <ConfirmDialog
          confirmLabel="Отменить расход"
          destructive
          isBusy={voidingExpenseId === expenseToVoid.id}
          onCancel={() => {
            setExpenseToVoid(null);
            setVoidReason("");
          }}
          onConfirm={() => void handleVoid(expenseToVoid)}
          title="Отменить расход?"
        >
          <div className="grid gap-3">
            <p>
              Расход <strong className="text-white">{money(expenseToVoid.amountCents)}</strong> будет исключен из финансовой аналитики.
            </p>
            <TextAreaField
              label="Причина отмены"
              onChange={(event) => setVoidReason(event.target.value)}
              rows={3}
              value={voidReason}
            />
            <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
              <p className="text-white">{expenseToVoid.description}</p>
              <p className="mt-1 text-white/55">
                {expenseToVoid.repairOrderNumber
                  ? `Заказ ${displayOrderNumber(expenseToVoid.repairOrderNumber)}`
                  : "Общий расход"}
              </p>
            </div>
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

export function ExpenseCreatePage({
  accessToken,
  itemId,
  navigate,
  orderId
}: {
  accessToken: string;
  itemId?: string;
  navigate: (screen: Screen) => void;
  orderId?: string;
}) {
  const [orders, setOrders] = useState<RepairOrderResponse[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryListResponse["items"]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodListResponse["items"]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<RepairOrderResponse | null>(null);
  const [description, setDescription] = useState("");
  const [amountRub, setAmountRub] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [repairOrderItemId, setRepairOrderItemId] = useState("");
  const [isGeneralExpense, setIsGeneralExpense] = useState(false);
  const [isSearchingOrders, setIsSearchingOrders] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null);
  const trimmedOrderSearch = orderSearch.trim();
  const hasOrderContext = Boolean(orderId);
  const isMoneyExpenseFlow = window.location.pathname.startsWith("/money/expenses");
  const returnMonth = monthFromSearch(window.location.search);
  const returnToExpenseList = () =>
    isMoneyExpenseFlow
      ? navigate({ section: "money", view: "expenses", month: returnMonth ?? undefined })
      : navigate({ section: "expenses", view: "list" });

  useEffect(() => {
    const headers = authHeaders(accessToken);

    Promise.all([
      request<ExpenseCategoryListResponse>("/api/v1/settings/expense-categories", { headers }),
      request<PaymentMethodListResponse>("/api/v1/settings/payment-methods", { headers })
    ])
      .then(([categoriesResponse, paymentMethodsResponse]) => {
        setCategories(categoriesResponse.items);
        setPaymentMethods(paymentMethodsResponse.items);
        setCategoryId(categoriesResponse.items[0]?.id ?? "");
        setPaymentMethodId(paymentMethodsResponse.items[0]?.id ?? "");
      })
      .catch(() => {
        setCategories([]);
        setPaymentMethods([]);
      });
  }, [accessToken]);

  useEffect(() => {
    if (!orderId) {
      setIsGeneralExpense(false);
      setSelectedOrder(null);
      setRepairOrderItemId("");
      setOrderSearch("");
      return;
    }

    setIsGeneralExpense(false);
    setError(null);
    setOrderSearchError(null);
    request<RepairOrderResponse>(`/api/v1/repair-orders/${orderId}`, {
      headers: authHeaders(accessToken)
    })
      .then((order) => {
        setSelectedOrder(order);
        setOrderSearch(displayOrderNumber(order.orderNumber));
        setRepairOrderItemId(itemId && order.items.some((item) => item.id === itemId) ? itemId : "");
      })
      .catch(() => setError("Не удалось загрузить заказ для расхода."));
  }, [accessToken, itemId, orderId]);

  useEffect(() => {
    if (hasOrderContext || isGeneralExpense || selectedOrder) {
      setOrders([]);
      setOrderSearchError(null);
      setIsSearchingOrders(false);
      return undefined;
    }

    if (!trimmedOrderSearch) {
      setOrders([]);
      setOrderSearchError(null);
      setIsSearchingOrders(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsSearchingOrders(true);
      setOrderSearchError(null);

      request<RepairOrdersListResponse>(
        `/api/v1/repair-orders?q=${encodeURIComponent(trimmedOrderSearch)}&limit=8`,
        {
          headers: authHeaders(accessToken)
        }
      )
        .then((response) => {
          if (!cancelled) {
            setOrders(response.items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOrders([]);
            setOrderSearchError("Не удалось найти заказы.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingOrders(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [accessToken, hasOrderContext, isGeneralExpense, selectedOrder, trimmedOrderSearch]);

  const selectedOrderItem = selectedOrder?.items.find((item) => item.id === repairOrderItemId);
  const amountCents = parsedMoneyOrZero(amountRub);
  const expenseScope = isGeneralExpense
    ? "Общий расход"
    : selectedOrderItem
      ? selectedOrderItem.name
      : selectedOrder
        ? displayOrderNumber(selectedOrder.orderNumber)
        : "Заказ не выбран";

  function handleOrderSearchChange(value: string) {
    setOrderSearch(value);
    setError(null);

    if (selectedOrder) {
      setSelectedOrder(null);
      setRepairOrderItemId("");
    }
  }

  function selectExpenseOrder(order: RepairOrderResponse) {
    setSelectedOrder(order);
    setOrderSearch(displayOrderNumber(order.orderNumber));
    setOrders([]);
    setRepairOrderItemId("");
    setError(null);
  }

  function handleGeneralExpenseChange(checked: boolean) {
    setIsGeneralExpense(checked);
    setError(null);
    setOrderSearchError(null);
    setOrders([]);

    if (checked) {
      setSelectedOrder(null);
      setRepairOrderItemId("");
      setOrderSearch("");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isGeneralExpense && !selectedOrder) {
      setError("Выберите заказ или отметьте общий расход.");
      return;
    }

    setIsCreating(true);

    try {
      const amountCents = rubToCents(amountRub);

      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error("Invalid amount");
      }

      await request<ExpenseResponse>("/api/v1/expenses", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          description,
          categoryId: categoryId || undefined,
          paymentMethodId: paymentMethodId || undefined,
          amountCents,
          repairOrderId: isGeneralExpense ? undefined : selectedOrder?.id,
          repairOrderItemId: isGeneralExpense ? undefined : repairOrderItemId || undefined
        })
      });

      if (orderId) {
        navigate({ section: "orders", view: "detail", orderId });
      } else {
        returnToExpenseList();
      }
    } catch {
      setError("Не удалось создать расход. Проверьте сумму и описание.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <PageToolbar
        back={() =>
          orderId
            ? navigate({ section: "orders", view: "detail", orderId })
            : returnToExpenseList()
        }
        title={orderId ? "Расход по заказу" : "Новый расход"}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <GlassPanel className="overflow-hidden p-5">
          <form className="relative grid gap-4" onSubmit={handleCreate}>
            <TextAreaField
              label="Описание"
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              value={description}
            />
            <TextField
              inputMode="decimal"
                label="Сумма, ₽"
              onChange={(event) => setAmountRub(event.target.value)}
              value={amountRub}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Категория" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                disabled={paymentMethods.length === 0}
                label="Способ оплаты"
                onChange={(event) => setPaymentMethodId(event.target.value)}
                value={paymentMethodId}
              >
                <option value="">{paymentMethods.length === 0 ? "Загружаем..." : "Выберите способ"}</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </SelectField>
            </div>
            {!hasOrderContext ? (
              <label className="flex items-start gap-3 rounded-lg bg-white/[0.055] p-3 text-sm text-white/62 shadow-inner-glass ring-1 ring-white/[0.08]">
                <input
                  checked={isGeneralExpense}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.08] accent-mint"
                  onChange={(event) => handleGeneralExpenseChange(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block font-medium text-white">Общий расход</span>
                  <span className="mt-1 block text-white/52">Без привязки к заказу</span>
                </span>
              </label>
            ) : null}
            {hasOrderContext ? (
              <div className="grid gap-3 rounded-lg bg-mint/10 p-3 text-sm text-white ring-1 ring-mint/20">
                {selectedOrder ? (
                  <>
                    <div>
                      <p className="font-medium">{orderSearchResultTitle(selectedOrder)}</p>
                      <p className="mt-1 text-white/52">
                        {selectedOrder.customerName ?? "Клиент не указан"}
                        {selectedOrder.customerPhone ? ` · ${selectedOrder.customerPhone}` : ""}
                      </p>
                    </div>
                    <SelectField
                      label="Куда отнести расход"
                      onChange={(event) => setRepairOrderItemId(event.target.value)}
                      value={repairOrderItemId}
                    >
                      <option value="">К заказу целиком</option>
                      {selectedOrder.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </SelectField>
                    <p className="rounded-lg bg-amber/10 p-3 text-sm leading-6 text-amber ring-1 ring-amber/20">
                      Расходник по конкретной услуге увеличит сумму заказа для клиента. Комиссия мастера считается
                      после себестоимости.
                    </p>
                  </>
                ) : (
                  <p className="text-white/58">Загружаем заказ...</p>
                )}
              </div>
            ) : isGeneralExpense ? (
              <div className="rounded-lg bg-white/[0.055] p-3 text-sm text-white/62 shadow-inner-glass ring-1 ring-white/[0.08]">
                Общий расход без привязки к заказу
              </div>
            ) : null}
            {!hasOrderContext && !isGeneralExpense ? (
              <div className="grid gap-3">
                <TextField
                  label="Найти заказ"
                  onChange={(event) => handleOrderSearchChange(event.target.value)}
                  placeholder="00001, R-00001, клиент, телефон"
                  value={orderSearch}
                />
                {selectedOrder ? (
                  <div className="grid gap-3 rounded-lg bg-mint/10 p-3 text-sm text-white ring-1 ring-mint/20 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{orderSearchResultTitle(selectedOrder)}</p>
                      <p className="mt-1 text-white/52">
                        {selectedOrder.customerName ?? "Клиент не указан"}
                        {selectedOrder.customerPhone ? ` · ${selectedOrder.customerPhone}` : ""}
                      </p>
                    </div>
                    <GhostButton
                      className="h-9 px-3"
                      onClick={() => {
                        setSelectedOrder(null);
                        setRepairOrderItemId("");
                        setOrderSearch("");
                      }}
                      type="button"
                    >
                      Сменить
                    </GhostButton>
                  </div>
                ) : null}
                {isSearchingOrders ? <p className="text-sm text-white/48">Ищем заказы...</p> : null}
                {orderSearchError ? <p className="text-sm text-coral">{orderSearchError}</p> : null}
                {!isSearchingOrders && trimmedOrderSearch && orders.length === 0 && !selectedOrder && !orderSearchError ? (
                  <p className="rounded-lg bg-white/[0.055] p-3 text-sm text-white/55 ring-1 ring-white/[0.08]">
                    Заказ не найден.
                  </p>
                ) : null}
                {orders.length > 0 && !selectedOrder ? (
                  <div className="grid gap-2">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        className="grid gap-1 rounded-md border border-white/10 bg-white/[0.055] px-3 py-3 text-left text-sm text-white transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.085] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
                        onClick={() => selectExpenseOrder(order)}
                        type="button"
                      >
                        <span className="font-medium">{orderSearchResultTitle(order)}</span>
                        <span className="text-xs text-white/48">
                          {order.customerName ?? "Клиент не указан"}
                          {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedOrder && !isGeneralExpense && !hasOrderContext ? (
              <div className="grid gap-3">
                <SelectField
                  label="Позиция заказа"
                  onChange={(event) => setRepairOrderItemId(event.target.value)}
                  value={repairOrderItemId}
                >
                  <option value="">К заказу целиком</option>
                  {selectedOrder.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </SelectField>
                <p className="rounded-lg bg-amber/10 p-3 text-sm leading-6 text-amber ring-1 ring-amber/20">
                  Расходник по конкретной услуге увеличит сумму заказа для клиента. Комиссия мастера считается после
                  себестоимости.
                </p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton disabled={isCreating || paymentMethods.length === 0 || !paymentMethodId} type="submit">
              {isCreating ? "Сохраняем..." : "Добавить расход"}
            </PrimaryButton>
          </form>
        </GlassPanel>

        <GlassPanel className="overflow-hidden p-5">
          <div className="relative">
            <p className="text-sm text-white/48">Предпросмотр</p>
            <h3 className="mt-1 text-2xl font-semibold">Расход</h3>
            <div className="mt-5 grid gap-3">
              <InlineStat label="Сумма" tone="text-coral" value={money(amountCents)} />
              <InlineStat label="Связь" value={expenseScope} />
              <div className="rounded-lg bg-amber/10 p-3 text-sm text-amber ring-1 ring-amber/20">
                Сохранится как черновик
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
