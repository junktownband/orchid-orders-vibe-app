import { ChevronLeft, ChevronRight, ClipboardList, PackagePlus, Plus, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DashboardResponse } from "@orchid/shared";

import { authHeaders, repairStatusOptions, request, type RepairStatus, type Screen } from "../../app/app-core";
import { GhostButton, GlassPanel, InlineStat, MetricCard, PrimaryButton, StatusPill } from "../../app/ui";

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

function dashboardPath(month: string) {
  return `/api/v1/analytics/dashboard?month=${month}`;
}

function countStatus(dashboard: DashboardResponse | null, status: RepairStatus) {
  return dashboard?.repairsByStatus.find((item) => item.status === status)?.count ?? 0;
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
  const statusCounts = useMemo(
    () =>
      repairStatusOptions.map((status) => ({
        ...status,
        count: countStatus(dashboard, status.value)
      })),
    [dashboard]
  );

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
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">Главная за {monthLabel(month)}</h2>
          </div>
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
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Заказов" tone="text-mint" value={isLoading ? "..." : String(dashboard?.kpis.repairOrdersCount ?? 0)} />
          <MetricCard label="В работе" value={isLoading ? "..." : String(activeCount)} />
          <MetricCard label="Готовы" tone="text-[rgb(var(--status-honey-text))]" value={isLoading ? "..." : String(readyCount)} />
          <MetricCard label="Выданы" tone="text-[rgb(var(--status-sage-text))]" value={isLoading ? "..." : String(issuedCount)} />
          <MetricCard label="Отменены" tone="text-[rgb(var(--status-rose-text))]" value={isLoading ? "..." : String(cancelledCount)} />
        </div>
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/48">Статусы</p>
              <h3 className="mt-1 text-2xl font-semibold">Состояние заказов</h3>
            </div>
            <StatusPill label={isLoading ? "Обновляем" : "Актуально"} tone={isLoading ? "neutral" : "sage"} />
          </div>

          <div className="mt-5 grid gap-2">
            {statusCounts.map((status) => (
              <div key={status.value} className="grid grid-cols-[minmax(0,1fr)_80px] items-center gap-3 border-t border-white/[0.07] py-3 first:border-t-0 first:pt-0">
                <span className="truncate text-sm text-white/68">{status.label}</span>
                <strong className="text-right text-lg tabular-nums text-white">{isLoading ? "..." : status.count}</strong>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">Быстрые действия</p>
          <div className="mt-4 grid gap-2">
            <PrimaryButton className="justify-center" onClick={() => navigate({ section: "orders", view: "create" })}>
              <Plus aria-hidden="true" size={17} />
              Новый заказ
            </PrimaryButton>
            <GhostButton className="justify-center" onClick={() => navigate({ section: "orders", view: "list" })}>
              <ClipboardList aria-hidden="true" size={17} />
              Заказы
            </GhostButton>
            <GhostButton className="justify-center" onClick={() => navigate({ section: "expenses", view: "create" })}>
              <WalletCards aria-hidden="true" size={17} />
              Новый расход
            </GhostButton>
            <GhostButton className="justify-center" onClick={() => navigate({ section: "settings", view: "services" })}>
              <PackagePlus aria-hidden="true" size={17} />
              Услуги
            </GhostButton>
          </div>
          <div className="mt-5 grid gap-2">
            <InlineStat label="Оплаченных заказов" value={isLoading ? "..." : String(dashboard?.kpis.paidOrdersCount ?? 0)} />
            <InlineStat label="Ожидают оплаты" value={isLoading ? "..." : String(dashboard?.kpis.unpaidOrdersCount ?? 0)} />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
