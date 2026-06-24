import { ClipboardList, PackagePlus, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

import type { DashboardResponse } from "@orchid/shared";

import { authHeaders, money, percent, request, type Screen } from "../../app/app-core";
import { GlassPanel, InlineStat, MetricCard, ResalePanel } from "../../app/ui";

export function DashboardPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    request<DashboardResponse>("/api/v1/analytics/dashboard", {
      headers: authHeaders(accessToken)
    })
      .then((response) => setDashboard(response))
      .catch(() => setDashboard(null))
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const grossMargin =
    dashboard && dashboard.kpis.paidRevenueCents > 0
      ? (dashboard.kpis.grossProfitCents / dashboard.kpis.paidRevenueCents) * 100
      : 0;

  return (
    <div className="grid gap-4">
      <GlassPanel className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/55">
              {isLoading ? "Расчет показателей..." : "Доступный остаток"}
            </p>
            <strong className="mt-3 block text-5xl font-semibold tracking-normal sm:text-7xl">
              {dashboard ? money(dashboard.kpis.netCashCents) : "—"}
            </strong>
          </div>
          <span className="rounded-full bg-mint/12 px-3 py-1 text-sm text-mint ring-1 ring-mint/25">
            {dashboard ? `${dashboard.kpis.paidOrdersCount} оплачено` : "live"}
          </span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Оплаченная выручка"
            tone="text-mint"
            value={dashboard ? money(dashboard.kpis.paidRevenueCents) : "—"}
          />
          <MetricCard
            label="Валовая прибыль"
            tone="text-lime-200"
            value={dashboard ? money(dashboard.kpis.grossProfitCents) : "—"}
          />
          <MetricCard label="Маржа" tone="text-sky-200" value={dashboard ? `${percent(grossMargin)}%` : "—"} />
          <MetricCard
            label="Комиссии к выплате"
            tone="text-orchid"
            value={dashboard ? money(dashboard.kpis.payableCommissionsCents) : "—"}
          />
          <MetricCard label="Заказов" tone="text-amber" value={dashboard ? String(dashboard.kpis.repairOrdersCount) : "—"} />
        </div>
      </GlassPanel>

      {dashboard ? (
        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/48">Денежный остаток</p>
              <h3 className="mt-1 text-2xl font-semibold">Состав остатка</h3>
            </div>
            <span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm text-white/58 ring-1 ring-white/10">
              кассовый метод
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <InlineStat label="Оплаты" tone="text-mint" value={money(dashboard.kpis.paidRevenueCents)} />
            <InlineStat
              label="Расходы"
              tone="text-coral"
              value={money(-dashboard.kpis.confirmedExpensesCents)}
            />
            <InlineStat
              label="Комиссии"
              tone="text-amber"
              value={money(-dashboard.kpis.payableCommissionsCents)}
            />
            <InlineStat label="Остаток" tone="text-mint" value={money(dashboard.kpis.netCashCents)} />
          </div>
        </GlassPanel>
      ) : null}

      <ResalePanel dashboard={dashboard} />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            label: "Новый заказ",
            icon: ClipboardList,
            action: () => navigate({ section: "orders", view: "create" })
          },
          {
            label: "Новый расход",
            icon: WalletCards,
            action: () => navigate({ section: "expenses", view: "create" })
          },
          {
            label: "Каталог услуг",
            icon: PackagePlus,
            action: () => navigate({ section: "settings", view: "services" })
          }
        ].map((action) => (
          <button
            key={action.label}
            className="group rounded-lg border border-white/[0.08] bg-panel/95 p-4 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
            onClick={action.action}
            type="button"
          >
            <span className="grid h-11 w-11 place-items-center rounded-md bg-white/[0.06] text-mint shadow-inner-glass ring-1 ring-white/10 transition-[background-color,color] group-hover:bg-mint group-hover:text-ink">
              <action.icon aria-hidden="true" size={20} />
            </span>
            <span className="mt-4 block text-lg font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
