import { ChevronLeft, ChevronRight, ClipboardList, PackagePlus, Plus, WalletCards, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import type { DashboardResponse } from "@orchid/shared";

import { authHeaders, request, type RepairStatus, type Screen } from "../../app/app-core";
import { GhostButton, GlassPanel, InlineStat, MetricCard } from "../../app/ui";

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

function dashboardPath(month: string) {
  return `/api/v1/analytics/dashboard?month=${month}`;
}

function countStatus(dashboard: DashboardResponse | null, status: RepairStatus) {
  return dashboard?.repairsByStatus.find((item) => item.status === status)?.count ?? 0;
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  primary = false
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`group flex min-h-[88px] items-center gap-4 rounded-xl border px-5 text-left transition-[background,border-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px ${
        primary
          ? "border-mint/24 bg-white/[0.115] text-white shadow-inner-glass hover:border-mint/36 hover:bg-white/[0.15]"
          : "border-white/[0.1] bg-white/[0.045] text-white/86 hover:border-white/[0.18] hover:bg-white/[0.075]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ring-1 transition-colors ${
          primary
            ? "bg-mint/14 text-mint ring-mint/24"
            : "bg-white/[0.06] text-white/68 ring-white/[0.09] group-hover:text-white"
        }`}
      >
        <Icon aria-hidden="true" size={24} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 text-base font-semibold tracking-normal">{label}</span>
    </button>
  );
}

export function DashboardPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [month, setMonth] = useState(monthFromSearch);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeCount = countStatus(dashboard, "ACCEPTED") + countStatus(dashboard, "IN_PROGRESS");
  const readyCount = countStatus(dashboard, "READY");
  const issuedCount = countStatus(dashboard, "ISSUED");
  const cancelledCount = countStatus(dashboard, "CANCELLED");

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    request<DashboardResponse>(dashboardPath(month), {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        if (!cancelled) {
          setDashboard(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDashboard(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, month]);

  function updateMonth(nextMonth: string) {
    setMonth(nextMonth);
    window.history.replaceState(null, "", nextMonth === currentMonthValue() ? "/" : `/?month=${nextMonth}`);
  }

  return (
    <div className="grid gap-4">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/48">Работа мастерской</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">Состояние заказов</h2>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton aria-label="Предыдущий месяц" className="h-10 w-10 px-0" onClick={() => updateMonth(shiftMonth(month, -1))}>
              <ChevronLeft aria-hidden="true" size={18} />
            </GhostButton>
            <GhostButton className="min-w-32 justify-center" onClick={() => updateMonth(currentMonthValue())}>
              {monthLabel(month)}
            </GhostButton>
            <GhostButton aria-label="Следующий месяц" className="h-10 w-10 px-0" onClick={() => updateMonth(shiftMonth(month, 1))}>
              <ChevronRight aria-hidden="true" size={18} />
            </GhostButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Заказов" tone="text-mint" value={isLoading ? "..." : String(dashboard?.kpis.repairOrdersCount ?? 0)} />
          <MetricCard label="В работе" value={isLoading ? "..." : String(activeCount)} />
          <MetricCard label="Готовы" tone="text-[rgb(var(--status-honey-text))]" value={isLoading ? "..." : String(readyCount)} />
          <MetricCard label="Выданы" tone="text-[rgb(var(--status-sage-text))]" value={isLoading ? "..." : String(issuedCount)} />
          <MetricCard label="Отменены" tone="text-[rgb(var(--status-rose-text))]" value={isLoading ? "..." : String(cancelledCount)} />
        </div>
      </GlassPanel>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionButton icon={Plus} label="Новый заказ" onClick={() => navigate({ section: "orders", view: "create" })} primary />
        <QuickActionButton icon={ClipboardList} label="Заказы" onClick={() => navigate({ section: "orders", view: "list" })} />
        <QuickActionButton icon={WalletCards} label="Новый расход" onClick={() => navigate({ section: "expenses", view: "create" })} />
        <QuickActionButton icon={PackagePlus} label="Услуги" onClick={() => navigate({ section: "settings", view: "services" })} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <InlineStat label="Оплаченных заказов" value={isLoading ? "..." : String(dashboard?.kpis.paidOrdersCount ?? 0)} />
        <InlineStat label="Ожидают оплаты" value={isLoading ? "..." : String(dashboard?.kpis.unpaidOrdersCount ?? 0)} />
      </section>
    </div>
  );
}
