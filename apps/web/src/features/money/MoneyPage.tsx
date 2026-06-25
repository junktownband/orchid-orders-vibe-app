import { ChevronLeft, ChevronRight, Plus, RotateCcw, WalletCards } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import type { FinanceOperationResponse, FinanceOperationType, FinanceOverviewResponse } from "@orchid/shared";

import {
  authHeaders,
  dateTime,
  errorMessage,
  money,
  request,
  rubToCents,
  type Screen
} from "../../app/app-core";
import {
  GhostButton,
  GlassPanel,
  InlineStat,
  MetricCard,
  PageToolbar,
  PrimaryButton,
  SelectField,
  StatusPill,
  TextField
} from "../../app/ui";

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

  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
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
  WITHDRAWAL: "Вывод"
};

function operationTone(operation: FinanceOperationResponse) {
  return operation.direction === "IN" ? "sage" : "rose";
}

export function MoneyPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [month, setMonth] = useState(monthFromSearch);
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operationType, setOperationType] = useState<FinanceOperationType>("DEPOSIT");
  const [amountRub, setAmountRub] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
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
      setError(errorMessage(requestError, "Не удалось загрузить деньги."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh(month);
  }, [accessToken, month]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    window.history.replaceState(null, "", nextMonth === currentMonthValue() ? "/money" : `/money?month=${nextMonth}`);
  }

  async function createOperation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const amountCents = rubToCents(amountRub);

      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        throw new Error("Invalid amount");
      }

      await request<FinanceOperationResponse>("/api/v1/finance/operations", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          type: operationType,
          amountCents,
          description
        })
      });

      setAmountRub("");
      setDescription("");
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось провести операцию."));
    } finally {
      setIsCreating(false);
    }
  }

  const masterCommissions = overview?.masterCommissions ?? [];

  return (
    <div>
      <PageToolbar
        action={
          <div className="flex items-center gap-2">
            <GhostButton aria-label="Предыдущий месяц" className="h-10 w-10 px-0" onClick={() => updateMonth(shiftMonth(month, -1))}>
              <ChevronLeft aria-hidden="true" size={18} />
            </GhostButton>
            <GhostButton className="min-w-32 justify-center" onClick={() => updateMonth(currentMonthValue())}>
              Этот месяц
            </GhostButton>
            <GhostButton aria-label="Следующий месяц" className="h-10 w-10 px-0" onClick={() => updateMonth(shiftMonth(month, 1))}>
              <ChevronRight aria-hidden="true" size={18} />
            </GhostButton>
          </div>
        }
        title="Деньги"
      />

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/48">Счет мастерской</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">{monthLabel(month)}</h2>
          </div>
          <GhostButton disabled={isLoading} onClick={() => void refresh()} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Обновить
          </GhostButton>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Остаток счета" tone="text-mint" value={overview ? money(overview.account.balanceCents) : "..."} />
          <MetricCard
            label="После выплат"
            value={overview ? money(overview.account.availableAfterObligationsCents) : "..."}
          />
          <MetricCard label="Поступления" tone="text-[rgb(var(--status-sage-text))]" value={overview ? money(overview.summary.paidRevenueCents + overview.summary.manualInflowCents) : "..."} />
          <MetricCard label="Расходы" tone="text-[rgb(var(--status-rose-text))]" value={overview ? money(overview.summary.confirmedExpensesCents + overview.summary.manualOutflowCents) : "..."} />
          <MetricCard label="К выплате" tone="text-amber" value={overview ? money(overview.summary.payableCommissionsCents) : "..."} />
        </div>

        {overview && overview.account.cashGapRiskCents > 0 ? (
          <p className="mt-4 rounded-lg bg-coral/12 p-3 text-sm text-coral">
            Риск кассового разрыва: не хватает {money(overview.account.cashGapRiskCents)} после обязательств.
          </p>
        ) : null}
      </GlassPanel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">Ручная операция</p>
          <h3 className="mt-1 text-2xl font-semibold">Завести деньги</h3>
          <form className="mt-4 grid gap-3" onSubmit={(event) => void createOperation(event)}>
            <SelectField
              label="Тип"
              onChange={(event) => setOperationType(event.target.value as FinanceOperationType)}
              value={operationType}
            >
              <option value="DEPOSIT">Пополнение</option>
              <option value="WITHDRAWAL">Вывод</option>
            </SelectField>
            <TextField inputMode="decimal" label="Сумма, ₽" onChange={(event) => setAmountRub(event.target.value)} value={amountRub} />
            <TextField label="Описание" onChange={(event) => setDescription(event.target.value)} value={description} />
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton disabled={isCreating || !amountRub || !description} type="submit">
              <Plus aria-hidden="true" size={17} />
              {isCreating ? "Проводим..." : "Провести"}
            </PrimaryButton>
          </form>

          <div className="mt-5 grid gap-2">
            <GhostButton className="justify-center" onClick={() => navigate({ section: "expenses", view: "list" })}>
              <WalletCards aria-hidden="true" size={17} />
              Расходы
            </GhostButton>
            <GhostButton className="justify-center" onClick={() => navigate({ section: "analytics" })}>
              Выплаты мастерам
            </GhostButton>
          </div>
        </GlassPanel>

        <GlassPanel className="min-w-0 overflow-hidden p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/48">Журнал</p>
              <h3 className="mt-1 text-2xl font-semibold">Финансовые операции</h3>
            </div>
            <span className="text-sm text-white/45">{overview?.operations.length ?? 0} строк</span>
          </div>

          <div className="mt-4 grid gap-2">
            {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем операции...</p> : null}
            {!isLoading && overview?.operations.length === 0 ? (
              <p className="rounded-lg bg-white/[0.055] p-4 text-sm text-white/55 ring-1 ring-white/[0.08]">
                За выбранный месяц операций нет.
              </p>
            ) : null}
            {overview?.operations.map((operation) => (
              <article
                key={`${operation.source}-${operation.id}`}
                className="grid gap-3 border-t border-white/[0.07] py-3 first:border-t-0 first:pt-0 md:grid-cols-[150px_minmax(0,1fr)_150px]"
              >
                <div className="text-sm text-white/48">{dateTime(operation.occurredAt)}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={operationLabels[operation.type]} size="sm" tone={operationTone(operation)} />
                    {operation.repairOrderNumber ? (
                      <span className="text-sm text-white/42">№ {operation.repairOrderNumber}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate font-medium text-white">{operation.description}</p>
                  <p className="mt-1 truncate text-sm text-white/42">
                    {[operation.counterpartyName, operation.createdByName].filter(Boolean).join(" · ") || "Без связи"}
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

      <GlassPanel className="mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/48">Комиссии</p>
            <h3 className="mt-1 text-2xl font-semibold">Мастера за период</h3>
          </div>
          <span className="text-sm text-white/45">{masterCommissions.length} мастеров</span>
        </div>

        <div className="mt-4 grid gap-2">
          {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Собираем комиссии...</p> : null}
          {!isLoading && masterCommissions.length === 0 ? (
            <p className="rounded-lg bg-white/[0.055] p-4 text-sm text-white/55 ring-1 ring-white/[0.08]">
              За выбранный месяц комиссий по мастерам нет.
            </p>
          ) : null}
          {masterCommissions.map((master) => (
            <article
              key={master.masterMembershipId ?? master.masterName}
              className="grid gap-3 border-t border-white/[0.07] py-3 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(110px,140px))]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{master.masterName}</p>
                <p className="mt-1 text-sm text-white/42">
                  {master.accruedItemsCount} начислено · {master.paidItemsCount} выплачено · {master.payableItemsCount} ждут выплаты
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-white/38">Начислено</p>
                <p className="mt-1 font-semibold tabular-nums text-white">{money(master.accruedCents)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-white/38">Выплачено</p>
                <p className="mt-1 font-semibold tabular-nums text-[rgb(var(--status-sage-text))]">{money(master.paidCents)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-white/38">К выплате</p>
                <p className="mt-1 font-semibold tabular-nums text-amber">{money(master.payableCents)}</p>
              </div>
            </article>
          ))}
        </div>
      </GlassPanel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InlineStat label="Валовая прибыль" value={overview ? money(overview.summary.grossProfitCents) : "..."} />
        <InlineStat label="Себестоимость" value={overview ? money(overview.summary.paidCostCents) : "..."} />
        <InlineStat label="Выплачено мастерам" value={overview ? money(overview.summary.paidCommissionsCents) : "..."} />
        <InlineStat label="Средний заказ" value={overview ? money(overview.summary.averagePaidTicketCents) : "..."} />
      </div>
    </div>
  );
}
