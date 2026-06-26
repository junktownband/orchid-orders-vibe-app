import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { FinanceOperationResponse, FinanceOverviewResponse } from "@orchid/shared";

import { authHeaders, dateTime, errorMessage, money, request, type Navigate } from "../../app/app-core";
import { GhostButton, GlassPanel, PageToolbar, SelectField, StatusPill } from "../../app/ui";

function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthFromSearch() {
  const month = new URLSearchParams(window.location.search).get("month");

  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : currentMonthValue();
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

function financePath(month: string) {
  const range = dateRangeForMonth(month);

  return `/api/v1/finance?from=${range.from}&to=${range.to}`;
}

const operationLabels: Record<FinanceOperationResponse["type"], string> = {
  DEPOSIT: "Пополнение",
  EXPENSE_CONFIRMED: "Расход",
  PAYMENT_RECEIVED: "Оплата заказа",
  SALARY_PAYOUT: "Выплата мастеру",
  TAX_EXPENSE: "Налог",
  WITHDRAWAL: "Списание"
};

function operationTone(operation: FinanceOperationResponse) {
  return operation.direction === "IN" ? "sage" : "rose";
}

function isPresentString(value: string | null): value is string {
  return Boolean(value);
}

type DirectionFilter = "" | FinanceOperationResponse["direction"];

export function MoneyLedgerPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: Navigate;
}) {
  const [month, setMonth] = useState(monthFromSearch);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextMonth = month) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await request<FinanceOverviewResponse>(financePath(nextMonth), {
        headers: authHeaders(accessToken)
      });

      setOverview(response);
    } catch (requestError) {
      setOverview(null);
      setError(errorMessage(requestError, "Не удалось загрузить операции."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh(month);
  }, [accessToken, month]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    window.history.replaceState(null, "", `/money/ledger?month=${nextMonth}`);
  }

  const operations = overview?.operations ?? [];
  const paymentMethodOptions = useMemo(
    () =>
      [...new Set(operations.map((operation) => operation.paymentMethodName).filter(isPresentString))].sort(
        (left, right) => left.localeCompare(right, "ru")
      ),
    [operations]
  );
  const filteredOperations = useMemo(
    () =>
      operations.filter(
        (operation) =>
          (!directionFilter || operation.direction === directionFilter) &&
          (!paymentMethodFilter || operation.paymentMethodName === paymentMethodFilter)
      ),
    [directionFilter, operations, paymentMethodFilter]
  );

  return (
    <div>
      <PageToolbar
        action={
          <GhostButton
            aria-label="Обновить операции"
            className="h-10 w-10 px-0"
            disabled={isLoading}
            onClick={() => void refresh()}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
          </GhostButton>
        }
        back={() => navigate({ section: "money", view: "overview", month })}
        count={filteredOperations.length}
        title="Журнал операций"
      />

      <GlassPanel className="mb-4 p-4">
        <div className="mx-auto grid w-full max-w-md grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
          <GhostButton aria-label="Предыдущий месяц" className="h-11 w-11 px-0" onClick={() => updateMonth(shiftMonth(month, -1))}>
            <ChevronLeft aria-hidden="true" size={18} />
          </GhostButton>
          <button
            className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.055] px-4 py-3 text-center text-lg font-semibold tracking-normal text-white shadow-inner-glass transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30"
            onClick={() => updateMonth(currentMonthValue())}
            type="button"
          >
            {monthLabel(month)}
          </button>
          <GhostButton aria-label="Следующий месяц" className="h-11 w-11 px-0" onClick={() => updateMonth(shiftMonth(month, 1))}>
            <ChevronRight aria-hidden="true" size={18} />
          </GhostButton>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Движение"
            onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)}
            value={directionFilter}
          >
            <option value="">Все движения</option>
            <option value="IN">Поступления</option>
            <option value="OUT">Списания</option>
          </SelectField>
          <SelectField
            label="Способ оплаты"
            onChange={(event) => setPaymentMethodFilter(event.target.value)}
            value={paymentMethodFilter}
          >
            <option value="">Все способы</option>
            {paymentMethodOptions.map((methodName) => (
              <option key={methodName} value={methodName}>
                {methodName}
              </option>
            ))}
          </SelectField>
        </div>
      </GlassPanel>

      {error ? <p className="mb-4 rounded-lg bg-coral/12 p-4 text-coral">{error}</p> : null}

      <GlassPanel className="min-w-0 overflow-hidden p-5">
        {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем операции...</p> : null}
        {!isLoading && operations.length === 0 ? (
          <div className="grid min-h-44 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 text-center text-sm text-white/45">
            За выбранный месяц операций нет.
          </div>
        ) : null}
        {!isLoading && operations.length > 0 && filteredOperations.length === 0 ? (
          <div className="grid min-h-44 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 text-center text-sm text-white/45">
            Нет операций под выбранные фильтры.
          </div>
        ) : null}
        <div className="grid gap-1">
          {filteredOperations.map((operation) => (
            <article
              key={`${operation.source}-${operation.id}`}
              className="grid gap-3 border-t border-white/[0.07] py-3 first:border-t-0 first:pt-0 md:grid-cols-[150px_minmax(0,1fr)_150px]"
            >
              <div className="text-sm text-white/48">{dateTime(operation.occurredAt)}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={operationLabels[operation.type]} size="sm" tone={operationTone(operation)} />
                  {operation.repairOrderNumber ? <span className="text-sm text-white/42">№ {operation.repairOrderNumber}</span> : null}
                </div>
                <p className="mt-2 truncate font-medium text-white">{operation.description}</p>
                <p className="mt-1 truncate text-sm text-white/42">
                  {[operation.paymentMethodName, operation.counterpartyName, operation.createdByName].filter(Boolean).join(" · ") || "Без связи"}
                </p>
              </div>
              <strong className={`text-right text-lg tabular-nums ${operation.direction === "IN" ? "text-[rgb(var(--status-sage-text))]" : "text-[rgb(var(--status-rose-text))]"}`}>
                {money(operation.signedAmountCents)}
              </strong>
            </article>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
