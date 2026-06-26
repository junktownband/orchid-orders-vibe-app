import { ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { FinanceOverviewResponse, FinanceReceivableOrderResponse } from "@orchid/shared";

import {
  authHeaders,
  dateTime,
  displayOrderNumber,
  errorMessage,
  money,
  paymentStatusLabel,
  repairStatusLabel,
  repairStatusTone,
  request,
  type Navigate
} from "../../app/app-core";
import { GhostButton, GlassPanel, PageToolbar, StatusPill } from "../../app/ui";

function currentMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthFromSearch() {
  const month = new URLSearchParams(window.location.search).get("month");

  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : currentMonthValue();
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

function paymentTone(status: FinanceReceivableOrderResponse["paymentStatus"]) {
  if (status === "UNPAID") {
    return "rose";
  }

  if (status === "PARTIALLY_PAID") {
    return "amber";
  }

  return "neutral";
}

function receivableTitle(order: FinanceReceivableOrderResponse) {
  return order.instrumentName ?? order.customerName ?? displayOrderNumber(order.orderNumber);
}

export function MoneyReceivablesPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: Navigate;
}) {
  const [month] = useState(monthFromSearch);
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await request<FinanceOverviewResponse>(financePath(month), {
        headers: authHeaders(accessToken)
      });

      setOverview(response);
    } catch (requestError) {
      setOverview(null);
      setError(errorMessage(requestError, "Не удалось загрузить дебиторку."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [accessToken, month]);

  const orders = overview?.receivableOrders ?? [];
  const totalDueCents = useMemo(
    () => orders.reduce((sum, order) => sum + order.balanceDueCents, 0),
    [orders]
  );
  const partiallyPaidCount = orders.filter((order) => order.paymentStatus === "PARTIALLY_PAID").length;

  return (
    <div>
      <PageToolbar
        action={
          <GhostButton
            aria-label="Обновить дебиторку"
            className="h-10 w-10 px-0"
            disabled={isLoading}
            onClick={() => void refresh()}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
          </GhostButton>
        }
        back={() => navigate({ section: "money", view: "overview", month })}
        count={orders.length}
        title="Дебиторка"
      />

      {error ? <p className="mb-4 rounded-lg bg-coral/12 p-4 text-coral">{error}</p> : null}

      <GlassPanel className="mb-4 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-white/38">К получению</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber">
              {overview ? money(totalDueCents) : "..."}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-white/38">Заказов с долгом</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {overview ? orders.length : "..."}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-white/38">Частично оплачены</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {overview ? partiallyPaidCount : "..."}
            </p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="min-w-0 overflow-hidden p-5">
        {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем дебиторку...</p> : null}
        {!isLoading && orders.length === 0 ? (
          <div className="grid min-h-44 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.035] p-5 text-center text-sm text-white/45">
            Нет заказов с долгом.
          </div>
        ) : null}
        <div className="grid gap-1">
          {orders.map((order) => (
            <button
              aria-label={`Открыть заказ ${displayOrderNumber(order.orderNumber)}`}
              className="group grid w-full gap-3 border-t border-white/[0.07] py-4 text-left first:border-t-0 first:pt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 md:grid-cols-[minmax(0,1.3fr)_170px_170px_44px] md:items-center"
              key={order.id}
              onClick={() => navigate({ section: "orders", view: "detail", orderId: order.id })}
              type="button"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-base font-medium text-white">{receivableTitle(order)}</span>
                  <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-white/65 ring-1 ring-white/10">
                    {displayOrderNumber(order.orderNumber)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-white/45">{order.customerName ?? "Клиент не указан"}</p>
                <p className="mt-1 text-xs text-white/36">Обновлен: {dateTime(order.updatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label={repairStatusLabel(order.repairStatus)} size="sm" tone={repairStatusTone(order.repairStatus)} />
                <StatusPill label={paymentStatusLabel(order.paymentStatus)} size="sm" tone={paymentTone(order.paymentStatus)} />
              </div>
              <div className="md:text-right">
                <p className="text-lg font-semibold tabular-nums text-amber">{money(order.balanceDueCents)}</p>
                <p className="text-xs text-white/42">
                  Оплачено {money(order.paidAmountCents)} из {money(order.totalAmountCents)}
                </p>
              </div>
              <span className="hidden h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.045] text-white/45 shadow-inner-glass transition-[background-color,color] group-hover:bg-white/[0.075] group-hover:text-white md:inline-flex">
                <ChevronRight aria-hidden="true" size={18} />
              </span>
            </button>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
