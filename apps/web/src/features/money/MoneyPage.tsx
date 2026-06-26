import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  History,
  Landmark,
  PieChart,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  FinanceExpenseBreakdownResponse,
  FinanceOperationResponse,
  FinanceOperationType,
  FinancePaymentMethodBreakdownResponse,
  FinanceOverviewResponse,
  PaymentMethodListResponse,
  PaymentMethodResponse
} from "@orchid/shared";

import {
  authHeaders,
  errorMessage,
  money,
  percent,
  request,
  rubToCents,
  type Screen
} from "../../app/app-core";
import {
  ConfirmDialog,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  SelectField,
  TextAreaField,
  TextField
} from "../../app/ui";

type ChartDatum = {
  label: string;
  value: number;
  caption?: string;
  color: string;
};

const chartColors = ["#7dd3fc", "#86efac", "#fbbf24", "#fb7185", "#c4b5fd", "#fda4af"];

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

function pluralRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function ordersWaitCaption(count: number) {
  const word = pluralRu(count, "заказ", "заказа", "заказов");
  const verb = count === 1 ? "ждет" : "ждут";

  return `${count} ${word} ${verb} оплаты`;
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

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = {
    x: cx + radius * Math.cos(startAngle),
    y: cy + radius * Math.sin(startAngle)
  };
  const end = {
    x: cx + radius * Math.cos(endAngle),
    y: cy + radius * Math.sin(endAngle)
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function DonutChart({
  centerLabel,
  centerValue,
  data
}: {
  centerLabel: string;
  centerValue: string;
  data: ChartDatum[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = -Math.PI / 2;

  return (
    <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-44 w-44">
        <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 160 160">
          {total <= 0 ? (
            <circle cx="80" cy="80" fill="rgba(255,255,255,0.055)" r="62" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          ) : (
            data.map((item) => {
              const angle = (item.value / total) * Math.PI * 2;
              const currentStartAngle = startAngle;

              startAngle += angle;

              if (item.value <= 0) {
                return null;
              }

              if (angle >= Math.PI * 2 - 0.0001) {
                return <circle cx="80" cy="80" fill={item.color} key={item.label} opacity="0.9" r="68" />;
              }

              return <path d={arcPath(80, 80, 68, currentStartAngle, currentStartAngle + angle)} fill={item.color} key={item.label} opacity="0.9" />;
            })
          )}
          <circle cx="80" cy="80" fill="rgb(7 16 31)" r="42" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{centerValue}</p>
            <p className="mt-1 text-xs uppercase text-white/42">{centerLabel}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {data.map((item) => {
          const share = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3" key={item.label}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.label}</p>
                {item.caption ? <p className="mt-0.5 truncate text-xs text-white/42">{item.caption}</p> : null}
              </div>
              <span className="text-sm tabular-nums text-white/62">{percent(share)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarList({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => (
        <div className="grid gap-1.5" key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-white/72">{item.label}</span>
            <span className="shrink-0 tabular-nums text-white">{item.caption ?? money(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: item.color,
                width: `${Math.max(3, (item.value / maxValue) * 100)}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 text-center text-sm text-white/45">
      {text}
    </div>
  );
}

function StatHeader({
  icon: Icon,
  label,
  title
}: {
  icon: typeof Banknote;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-white/72 ring-1 ring-white/[0.08]">
        <Icon aria-hidden="true" size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-white/45">{label}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-normal">{title}</h3>
      </div>
    </div>
  );
}

function PlainMetric({
  label,
  tone = "text-white",
  value
}: {
  label: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase text-white/38">{label}</p>
      <p className={`mt-1 break-words text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function breakdownData(items: FinanceExpenseBreakdownResponse[], formatter = money): ChartDatum[] {
  return items.slice(0, 6).map((item, index) => ({
    label: item.label,
    value: item.amountCents,
    caption: `${formatter(item.amountCents)} · ${item.count}`,
    color: chartColors[index % chartColors.length]
  }));
}

function PaymentMethodFlowList({ items }: { items: FinancePaymentMethodBreakdownResponse[] }) {
  const maxValue = Math.max(...items.map((item) => Math.max(item.inflowCents, item.outflowCents)), 1);
  const barWidth = (value: number) => (value > 0 ? `${Math.max(3, (value / maxValue) * 100)}%` : "0%");

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <article className="grid gap-2 rounded-lg bg-white/[0.045] p-3 ring-1 ring-white/[0.08]" key={item.key}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{item.label}</p>
              <p className="mt-0.5 text-xs text-white/42">{item.count} операций</p>
            </div>
            <p className={`shrink-0 text-lg font-semibold tabular-nums ${item.netCents < 0 ? "text-coral" : "text-mint"}`}>
              {money(item.netCents)}
            </p>
          </div>

          <div className="grid gap-1.5">
            <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
              <span className="text-white/42">Вход</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-mint" style={{ width: barWidth(item.inflowCents) }} />
              </div>
              <span className="tabular-nums text-white/62">{money(item.inflowCents)}</span>
            </div>
            <div className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
              <span className="text-white/42">Выход</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-coral" style={{ width: barWidth(item.outflowCents) }} />
              </div>
              <span className="tabular-nums text-white/62">{money(item.outflowCents)}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
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
  const [manualOperationType, setManualOperationType] = useState<FinanceOperationType | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [amountRub, setAmountRub] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
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

  useEffect(() => {
    function refreshOnReturn() {
      if (document.visibilityState !== "hidden") {
        void refresh(month);
      }
    }

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [accessToken, month]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    window.history.replaceState(null, "", nextMonth === currentMonthValue() ? "/money" : `/money?month=${nextMonth}`);
  }

  async function loadPaymentMethods() {
    if (paymentMethods.length > 0 || isLoadingPaymentMethods) {
      return;
    }

    setIsLoadingPaymentMethods(true);

    try {
      const response = await request<PaymentMethodListResponse>("/api/v1/settings/payment-methods", {
        headers: authHeaders(accessToken)
      });

      setPaymentMethods(response.items);
      setSelectedPaymentMethodId((current) => current || (response.items[0]?.id ?? ""));
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось загрузить способы оплаты."));
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }

  function openManualOperation(type: FinanceOperationType) {
    setManualOperationType(type);
    setAmountRub("");
    setDescription(type === "DEPOSIT" ? "Пополнение счета" : "Списание со счета");
    setComment("");
    setSelectedPaymentMethodId((current) => current || (paymentMethods[0]?.id ?? ""));
    setError(null);
    void loadPaymentMethods();
  }

  function closeManualOperation() {
    if (isCreating) {
      return;
    }

    setManualOperationType(null);
    setAmountRub("");
    setDescription("");
    setComment("");
  }

  async function createManualOperation() {
    if (!manualOperationType) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const amountCents = rubToCents(amountRub);

      if (
        !Number.isFinite(amountCents) ||
        amountCents <= 0 ||
        description.trim().length < 2 ||
        !selectedPaymentMethodId
      ) {
        throw new Error("Invalid operation");
      }

      await request<FinanceOperationResponse>("/api/v1/finance/operations", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          type: manualOperationType,
          amountCents,
          paymentMethodId: selectedPaymentMethodId,
          description: description.trim(),
          comment: comment.trim() || undefined
        })
      });

      closeManualOperation();
      await refresh();
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось провести операцию."));
    } finally {
      setIsCreating(false);
    }
  }

  const masterCommissions = overview?.masterCommissions ?? [];
  const serviceMixData = useMemo(() => {
    const mix = overview?.analytics.serviceMix;

    if (!mix) {
      return [];
    }

    return [
      {
        label: "Стандартные",
        value: mix.standard.count,
        caption: money(mix.standard.revenueCents),
        color: "#7dd3fc"
      },
      {
        label: "Нестандартные",
        value: mix.custom.count,
        caption: money(mix.custom.revenueCents),
        color: "#fbbf24"
      }
    ];
  }, [overview]);
  const masterWorkData = useMemo(
    () =>
      (overview?.analytics.masterWorks ?? []).slice(0, 6).map((master, index) => ({
        label: master.masterName,
        value: master.servicesCount,
        caption: money(master.revenueCents),
        color: chartColors[index % chartColors.length]
      })),
    [overview]
  );
  const cashflowData = overview
    ? [
        {
          label: "Оплаты заказов",
          value: overview.summary.paidRevenueCents,
          color: "#86efac"
        },
        {
          label: "Пополнения",
          value: overview.summary.manualInflowCents,
          color: "#7dd3fc"
        },
        {
          label: "Расходы",
          value: overview.summary.confirmedExpensesCents,
          color: "#fb7185"
        },
        {
          label: "Списания",
          value: overview.summary.manualOutflowCents,
          color: "#fbbf24"
        },
        {
          label: "Выплачено мастерам",
          value: overview.summary.paidCommissionsCents,
          color: "#c4b5fd"
        }
      ]
    : [];
  const totalServiceCount =
    (overview?.analytics.serviceMix.standard.count ?? 0) + (overview?.analytics.serviceMix.custom.count ?? 0);
  const totalMasterWorks = masterWorkData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid gap-4">
      <section className="flex justify-center">
        <div className="grid w-full max-w-md grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
          <button
            aria-label="Предыдущий месяц"
            className="grid h-12 w-12 touch-manipulation place-items-center rounded-full text-white/62 transition-[background,color,transform] hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
            onClick={() => updateMonth(shiftMonth(month, -1))}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={26} strokeWidth={1.9} />
          </button>
          <button
            className="min-w-0 rounded-lg px-3 py-3 text-center text-xl font-semibold tracking-normal text-white transition-colors hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30"
            onClick={() => updateMonth(currentMonthValue())}
            type="button"
          >
            {monthLabel(month)}
          </button>
          <button
            aria-label="Следующий месяц"
            className="grid h-12 w-12 touch-manipulation place-items-center rounded-full text-white/62 transition-[background,color,transform] hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
            onClick={() => updateMonth(shiftMonth(month, 1))}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={26} strokeWidth={1.9} />
          </button>
        </div>
      </section>

      {error ? <p className="rounded-lg bg-coral/12 p-4 text-coral">{error}</p> : null}

      <section className="grid gap-3 xl:grid-cols-[1.05fr_0.8fr_0.8fr_0.9fr]">
        <GlassPanel as="article" className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatHeader icon={CircleDollarSign} label="Счет" title="Операции со счетом" />
            <div className="flex flex-wrap items-center gap-2">
              <PrimaryButton onClick={() => openManualOperation("DEPOSIT")}>
                <ArrowUpCircle aria-hidden="true" size={17} />
                Пополнение
              </PrimaryButton>
              <GhostButton onClick={() => openManualOperation("WITHDRAWAL")}>
                <ArrowDownCircle aria-hidden="true" size={17} />
                Списание
              </GhostButton>
              <GhostButton onClick={() => navigate({ section: "money", view: "ledger", month })}>
                <History aria-hidden="true" size={17} />
                Все операции
              </GhostButton>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel as="article" className="p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center xl:grid-cols-1 xl:items-start">
            <StatHeader icon={ReceiptText} label="Расходы" title="Расходы бизнеса" />
            <div className="grid gap-3 xl:w-full">
              <div className="flex items-center justify-between gap-3">
                <PlainMetric label="Без выплат мастерам" tone="text-[rgb(var(--status-rose-text))]" value={overview ? money(overview.summary.confirmedExpensesCents) : "..."} />
                <GhostButton onClick={() => navigate({ section: "money", view: "expenses", month })}>
                  <ReceiptText aria-hidden="true" size={17} />
                  Расходы
                </GhostButton>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel as="article" className="p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center xl:grid-cols-1 xl:items-start">
            <StatHeader icon={TrendingDown} label="Контроль" title="Все исходящие" />
            <div className="flex items-center justify-between gap-3 xl:w-full">
              <PlainMetric
                label="За месяц"
                tone="text-[rgb(var(--status-rose-text))]"
                value={
                  overview
                    ? money(
                        overview.summary.confirmedExpensesCents +
                          overview.summary.paidCommissionsCents +
                          overview.summary.manualOutflowCents
                      )
                    : "..."
                }
              />
              <GhostButton onClick={() => navigate({ section: "money", view: "expenses", month, expenseScope: "all" })}>
                <ReceiptText aria-hidden="true" size={17} />
                Все
              </GhostButton>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel as="article" className="p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center xl:grid-cols-1 xl:items-start">
            <StatHeader icon={Users} label="Обязательства" title="Выплаты мастерам" />
            <div className="grid gap-3 xl:w-full">
              <div className="grid grid-cols-2 gap-3">
                <PlainMetric label="К выплате" tone="text-amber" value={overview ? money(overview.summary.payableCommissionsCents) : "..."} />
                <PlainMetric label="Выплачено" tone="text-[rgb(var(--status-rose-text))]" value={overview ? money(overview.summary.paidCommissionsCents) : "..."} />
              </div>
              <GhostButton onClick={() => navigate({ section: "money", view: "payouts", month })}>
                <Users aria-hidden="true" size={17} />
                Выплаты мастерам
              </GhostButton>
            </div>
          </div>
        </GlassPanel>
      </section>

      <GlassPanel className="p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <StatHeader icon={Landmark} label="Счет мастерской" title="Финансовая позиция" />
              <GhostButton onClick={() => navigate({ section: "money", view: "audit" })}>
                <History aria-hidden="true" size={17} />
                Финансовый журнал
              </GhostButton>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 xl:grid-cols-4">
              <PlainMetric label="Остаток счета" tone="text-mint" value={overview ? money(overview.account.balanceCents) : "..."} />
              <PlainMetric label="После выплат" value={overview ? money(overview.account.availableAfterObligationsCents) : "..."} />
              <PlainMetric label="Поступления" tone="text-[rgb(var(--status-sage-text))]" value={overview ? money(overview.summary.paidRevenueCents + overview.summary.manualInflowCents) : "..."} />
              <PlainMetric
                label="Все исходящие"
                tone="text-[rgb(var(--status-rose-text))]"
                value={
                  overview
                    ? money(
                        overview.summary.confirmedExpensesCents +
                          overview.summary.paidCommissionsCents +
                          overview.summary.manualOutflowCents
                      )
                    : "..."
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4 sm:grid-cols-3 xl:grid-cols-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <PlainMetric label="Чистое движение" tone={overview && overview.summary.netMovementCents < 0 ? "text-coral" : "text-mint"} value={overview ? money(overview.summary.netMovementCents) : "..."} />
            <PlainMetric label="К выплате мастерам" tone="text-amber" value={overview ? money(overview.summary.payableCommissionsCents) : "..."} />
            <div className="col-span-2 sm:col-span-1 xl:col-span-1">
              <PlainMetric label="Средний оплаченный заказ" value={overview ? money(overview.summary.averagePaidTicketCents) : "..."} />
            </div>
            <div className="col-span-2 border-t border-white/[0.08] pt-4 sm:col-span-3 xl:col-span-1">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <PlainMetric label="Дебиторка" tone="text-amber" value={overview ? money(overview.summary.receivablesCents) : "..."} />
                  <p className="mt-2 text-sm text-white/45">
                    {overview
                      ? `${ordersWaitCaption(overview.summary.unpaidOrdersCount)}${
                          overview.summary.partiallyPaidOrdersCount > 0
                            ? ` · ${overview.summary.partiallyPaidOrdersCount} ${pluralRu(
                                overview.summary.partiallyPaidOrdersCount,
                                "частично оплачен",
                                "частично оплачены",
                                "частично оплачены"
                              )}`
                            : ""
                        }`
                      : "..."}
                  </p>
                </div>
                <GhostButton
                  aria-label="Открыть дебиторку"
                  disabled={!overview || overview.summary.unpaidOrdersCount === 0}
                  onClick={() => navigate({ section: "money", view: "receivables", month })}
                >
                  Дебиторка
                </GhostButton>
              </div>
            </div>
          </div>
        </div>
        {overview && overview.account.cashGapRiskCents > 0 ? (
          <p className="mt-4 rounded-lg bg-coral/12 p-3 text-sm text-coral">
            Риск кассового разрыва: не хватает {money(overview.account.cashGapRiskCents)} после обязательств.
          </p>
        ) : null}
      </GlassPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)_minmax(300px,0.7fr)]">
        <GlassPanel className="p-5">
          <StatHeader icon={TrendingUp} label="Cashflow" title="Движение денег" />
          <div className="mt-5">
            {cashflowData.some((item) => item.value > 0) ? <BarList data={cashflowData} /> : <EmptyChart text="За период пока нет движений денег." />}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <StatHeader icon={WalletCards} label="Оплата" title="Наличные и перевод" />
          <div className="mt-5">
            {overview && overview.analytics.paymentMethods.length > 0 ? (
              <PaymentMethodFlowList items={overview.analytics.paymentMethods} />
            ) : (
              <EmptyChart text="Движений по наличным и переводу за период пока нет." />
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <StatHeader icon={Scale} label="Прибыльность" title="Маржа периода" />
          <div className="mt-5 grid gap-4">
            <PlainMetric label="Оплаченная выручка" tone="text-mint" value={overview ? money(overview.summary.paidRevenueCents) : "..."} />
            <PlainMetric label="Себестоимость" value={overview ? money(overview.summary.paidCostCents) : "..."} />
            <PlainMetric label="Валовая прибыль" tone="text-amber" value={overview ? money(overview.summary.grossProfitCents) : "..."} />
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <StatHeader icon={PieChart} label="Услуги" title="Стандартные и нестандартные" />
          <div className="mt-5">
            {totalServiceCount > 0 ? (
              <DonutChart centerLabel="Услуг" centerValue={String(totalServiceCount)} data={serviceMixData} />
            ) : (
              <EmptyChart text="Выполненных услуг за период пока нет." />
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <StatHeader icon={Users} label="Мастера" title="Работы по мастерам" />
          <div className="mt-5">
            {totalMasterWorks > 0 ? (
              <DonutChart centerLabel="Работ" centerValue={String(totalMasterWorks)} data={masterWorkData} />
            ) : (
              <EmptyChart text="Выполненных работ по мастерам за период пока нет." />
            )}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassPanel className="p-5">
          <StatHeader icon={ReceiptText} label="Расходы" title="По статьям" />
          <div className="mt-5">
            {overview && overview.analytics.expensesByCategory.length > 0 ? (
              <DonutChart
                centerLabel="Расходы"
                centerValue={money(overview.summary.confirmedExpensesCents)}
                data={breakdownData(overview.analytics.expensesByCategory)}
              />
            ) : (
              <EmptyChart text="Подтвержденных расходов за период пока нет." />
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <StatHeader icon={CircleDollarSign} label="Контроль" title="Кто внес расходы" />
          <div className="mt-5">
            {overview && overview.analytics.expensesByCreator.length > 0 ? (
              <BarList data={breakdownData(overview.analytics.expensesByCreator)} />
            ) : (
              <EmptyChart text="Нет расходов с автором внесения за период." />
            )}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <StatHeader icon={Users} label="Обязательства" title="Мастера за период" />
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

      {manualOperationType ? (
        <ConfirmDialog
          confirmLabel={manualOperationType === "DEPOSIT" ? "Пополнить" : "Списать"}
          destructive={manualOperationType === "WITHDRAWAL"}
          isBusy={isCreating}
          onCancel={closeManualOperation}
          onConfirm={() => void createManualOperation()}
          title={manualOperationType === "DEPOSIT" ? "Пополнение счета" : "Списание со счета"}
        >
          <div className="grid gap-3">
            <TextField inputMode="decimal" label="Сумма, ₽" onChange={(event) => setAmountRub(event.target.value)} value={amountRub} />
            <SelectField
              label="Способ оплаты"
              onChange={(event) => setSelectedPaymentMethodId(event.target.value)}
              value={selectedPaymentMethodId}
            >
              {paymentMethods.length === 0 ? (
                <option value="">{isLoadingPaymentMethods ? "Загружаем..." : "Не настроено"}</option>
              ) : null}
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Назначение" onChange={(event) => setDescription(event.target.value)} value={description} />
            <TextAreaField label="Комментарий" onChange={(event) => setComment(event.target.value)} rows={3} value={comment} />
            {error ? <p className="text-sm text-coral">{error}</p> : null}
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
