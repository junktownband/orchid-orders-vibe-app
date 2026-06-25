import { ChevronRight, LayoutGrid, List, Plus, SlidersHorizontal } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RepairOrderResponse, RepairOrdersListResponse } from "@orchid/shared";

import {
  authHeaders,
  dateTime,
  displayOrderNumber,
  errorMessage,
  money,
  orderTabOptions,
  orderWarnings,
  paymentStatusLabel,
  paymentStatusOptions,
  repairStatusLabel,
  repairStatusOptions,
  request,
  requestPathForOrders,
  serviceTypeLabel,
  type Navigate,
  type OrdersListQuery,
  type PaymentStatus,
  type RepairStatus
} from "../../app/app-core";
import {
  GhostButton,
  GlassPanel,
  PageToolbar,
  PrimaryButton,
  SelectField,
  TextField,
  WarningPill
} from "../../app/ui";

type OrdersViewMode = "compact" | "cards";

function orderHeadline(order: RepairOrderResponse) {
  return order.instrumentName || order.customerName || displayOrderNumber(order.orderNumber);
}

function orderOpenLabel(order: RepairOrderResponse) {
  return `${orderHeadline(order)} ${displayOrderNumber(order.orderNumber)} ${repairStatusLabel(order.repairStatus)} ${paymentStatusLabel(order.paymentStatus)}`;
}

function ViewModeButton({
  isActive,
  label,
  onClick,
  children
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={isActive}
      className={`inline-flex h-10 touch-manipulation items-center justify-center gap-2 rounded-md px-3 text-sm transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 ${
        isActive
          ? "bg-mint text-ink shadow-command"
          : "bg-white/[0.055] text-white/68 ring-1 ring-white/10 hover:bg-white/[0.09]"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function OrderCompactRow({
  canManageOrders,
  onOpen,
  order
}: {
  canManageOrders: boolean;
  onOpen: () => void;
  order: RepairOrderResponse;
}) {
  const warnings = orderWarnings(order);
  const customerLine = [order.customerName, order.customerPhone].filter(Boolean).join(" · ");

  return (
    <button
      aria-label={orderOpenLabel(order)}
      className="group relative block w-full rounded-lg border border-white/[0.12] bg-panel/72 p-3 text-left text-white shadow-glass backdrop-blur-[26px] transition-[background-color,border-color,box-shadow,transform] hover:border-white/[0.18] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/35 active:translate-y-px"
      onClick={onOpen}
      title={`Открыть ${displayOrderNumber(order.orderNumber)}`}
      type="button"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.35fr)_minmax(180px,1fr)_minmax(170px,0.9fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-medium">{orderHeadline(order)}</h3>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-white/65 ring-1 ring-white/10">
              {displayOrderNumber(order.orderNumber)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-white/48">{order.description}</p>
          {customerLine ? (
            <p className="mt-1 truncate text-xs text-white/42">{customerLine}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm text-white/72 ring-1 ring-white/10">
            {repairStatusLabel(order.repairStatus)}
          </span>
          <span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm text-white/65 ring-1 ring-white/10">
            {paymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
        <div className="min-w-0 text-sm text-white/45">
          <p className="truncate">Ответственный: {order.assignedMasterName ?? "не выбран"}</p>
          <p className="mt-1 truncate text-xs text-white/36">
            Создан: {dateTime(order.createdAt)}
            {order.issuedAt ? ` · закрыт: ${dateTime(order.issuedAt)}` : ""}
          </p>
          {warnings.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {warnings.map((warning) => (
                <WarningPill key={warning.text} warning={warning} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canManageOrders ? (
            <div className="min-w-[140px] lg:text-right">
              <p className="text-lg font-semibold tabular-nums">{money(order.totalAmountCents)}</p>
              <p className="text-xs text-white/40">маржа {money(order.grossProfitCents)}</p>
            </div>
          ) : null}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.045] text-white/45 shadow-inner-glass transition-[background-color,color] group-hover:bg-white/[0.075] group-hover:text-white">
            <ChevronRight aria-hidden="true" size={18} />
          </span>
        </div>
      </div>
    </button>
  );
}

export function OrdersListPage({
  accessToken,
  canManageOrders,
  navigate,
  query,
  onQueryChange
}: {
  accessToken: string;
  canManageOrders: boolean;
  navigate: Navigate;
  query: OrdersListQuery;
  onQueryChange: (query: OrdersListQuery, options?: { replace?: boolean }) => void;
}) {
  const [orders, setOrders] = useState<RepairOrderResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<OrdersViewMode>("compact");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    Boolean(query.repairStatus || query.paymentStatus)
  );
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const queryKey = useMemo(
    () => `${query.q}|${query.tab}|${query.repairStatus}|${query.paymentStatus}`,
    [query.paymentStatus, query.q, query.repairStatus, query.tab]
  );

  useEffect(() => {
    let cancelled = false;

    setOrders([]);
    setNextCursor(null);
    setHasMore(false);
    setError(null);
    setIsLoadingInitial(true);

    request<RepairOrdersListResponse>(requestPathForOrders(query), {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setOrders(response.items);
        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(requestError, "Не удалось загрузить заказы."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingInitial(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, query, queryKey]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingInitial || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await request<RepairOrdersListResponse>(
        requestPathForOrders(query, nextCursor),
        {
          headers: authHeaders(accessToken)
        }
      );

      setOrders((current) => {
        const seen = new Set(current.map((order) => order.id));
        const nextItems = response.items.filter((order) => !seen.has(order.id));

        return [...current, ...nextItems];
      });
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось загрузить следующую страницу заказов."));
    } finally {
      setIsLoadingMore(false);
    }
  }, [accessToken, hasMore, isLoadingInitial, isLoadingMore, nextCursor, query]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || !hasMore || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "420px"
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function updateQuery(patch: Partial<OrdersListQuery>, options?: { replace?: boolean }) {
    onQueryChange(
      {
        ...query,
        ...patch
      },
      options
    );
  }

  const hasAdvancedFilters = Boolean(query.repairStatus || query.paymentStatus);

  return (
    <div>
      <PageToolbar
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <div className="flex rounded-lg bg-black/10 p-1 ring-1 ring-white/[0.08]">
              <ViewModeButton
                isActive={viewMode === "compact"}
                label="Компактный список"
                onClick={() => setViewMode("compact")}
              >
                <List aria-hidden="true" size={16} />
                Компактно
              </ViewModeButton>
              <ViewModeButton
                isActive={viewMode === "cards"}
                label="Карточки заказов"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid aria-hidden="true" size={16} />
                Карточки
              </ViewModeButton>
            </div>
            {canManageOrders ? (
              <PrimaryButton onClick={() => navigate({ section: "orders", view: "create" })}>
                <Plus size={17} />
                Новый заказ
              </PrimaryButton>
            ) : null}
          </div>
        }
        count={orders.length}
        title="Заказы"
      />

      <GlassPanel className="mb-4 p-3 sm:p-4">
        <div className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <TextField
              label="Поиск"
              onChange={(event) => updateQuery({ q: event.target.value }, { replace: true })}
              placeholder="Клиент, телефон, инструмент, номер, мастер"
              value={query.q}
            />
            <GhostButton
              aria-expanded={showAdvancedFilters}
              className={`justify-center ${hasAdvancedFilters ? "border-mint/25 bg-mint/10 text-mint" : ""}`}
              onClick={() => setShowAdvancedFilters((value) => !value)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" size={16} />
              Фильтры
            </GhostButton>
          </div>
          {showAdvancedFilters ? (
            <div className="grid gap-3 border-t border-white/[0.08] pt-3 md:grid-cols-2">
              <SelectField
                label="Статус ремонта"
                onChange={(event) =>
                  updateQuery({ repairStatus: event.target.value as RepairStatus | "" })
                }
                value={query.repairStatus}
              >
                <option value="">Любой</option>
                {repairStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Оплата"
                onChange={(event) =>
                  updateQuery({ paymentStatus: event.target.value as PaymentStatus | "" })
                }
                value={query.paymentStatus}
              >
                <option value="">Любая</option>
                {paymentStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SelectField>
            </div>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {orderTabOptions.map((tab) => (
              <button
                key={tab.value}
                aria-pressed={query.tab === tab.value}
                className={`h-10 shrink-0 rounded-md px-3 text-sm transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 ${
                  query.tab === tab.value
                    ? "bg-mint text-ink shadow-command"
                    : "bg-white/[0.055] text-white/68 ring-1 ring-white/10 hover:bg-white/[0.09]"
                }`}
                onClick={() => updateQuery({ tab: tab.value })}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      <div className="mt-4 grid gap-3">
        {error ? <p className="rounded-lg bg-coral/12 p-4 text-coral">{error}</p> : null}
        {isLoadingInitial ? (
          <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем заказы...</p>
        ) : null}
        {!isLoadingInitial && orders.length === 0 ? (
          <GlassPanel className="p-5">
            <p className="text-white/62">Заказы не найдены.</p>
          </GlassPanel>
        ) : null}
        {viewMode === "compact"
          ? orders.map((order) => (
              <OrderCompactRow
                key={order.id}
                canManageOrders={canManageOrders}
                onOpen={() => navigate({ section: "orders", view: "detail", orderId: order.id })}
                order={order}
              />
            ))
          : null}
        {viewMode === "cards" ? (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3 min-[1800px]:grid-cols-4">
            {orders.map((order) => {
              const warnings = orderWarnings(order);
              const customerLine = [order.customerName, order.customerPhone]
                .filter(Boolean)
                .join(" · ");

              return (
                <button
                  key={order.id}
                  aria-label={orderOpenLabel(order)}
                  className="group flex h-full w-full flex-col rounded-lg border border-white/[0.12] bg-panel/72 p-4 text-left text-white shadow-glass backdrop-blur-[26px] transition-[background-color,border-color,box-shadow,transform] hover:border-white/[0.18] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/35 active:translate-y-px"
                  onClick={() => navigate({ section: "orders", view: "detail", orderId: order.id })}
                  title={`Открыть ${displayOrderNumber(order.orderNumber)}`}
                  type="button"
                >
                  <div className="grid gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 truncate text-lg font-medium">{orderHeadline(order)}</h3>
                        <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-white/65 ring-1 ring-white/10">
                          {displayOrderNumber(order.orderNumber)}
                        </span>
                        <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs text-white/65 ring-1 ring-white/10">
                          {paymentStatusLabel(order.paymentStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-white/48">{order.description}</p>
                      {customerLine ? (
                        <p className="mt-2 text-xs text-white/44">{customerLine}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-white/42">
                        Ответственный: {order.assignedMasterName ?? "не выбран"}
                        {order.paidByName ? ` · оплату принял ${order.paidByName}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-white/38">
                        Создан: {dateTime(order.createdAt)}
                        {order.issuedAt ? ` · закрыт: ${dateTime(order.issuedAt)}` : ""}
                      </p>
                      {warnings.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {warnings.map((warning) => (
                            <WarningPill key={warning.text} warning={warning} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {canManageOrders ? (
                      <div className="text-left">
                        <p className="text-2xl font-semibold">{money(order.totalAmountCents)}</p>
                        <p className="text-sm text-white/45">
                          Себестоимость {money(order.totalCostCents)} · маржа{" "}
                          {money(order.grossProfitCents)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid flex-1 gap-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-1 rounded-lg bg-black/18 px-3 py-2 text-sm shadow-inner-glass ring-1 ring-white/[0.09]"
                      >
                        <span className="min-w-0 truncate">
                          {item.name} · {serviceTypeLabel(item.type)}
                        </span>
                        {canManageOrders ? (
                          <span className="text-white/68">
                            {money(item.priceCents)} / себ. {money(item.costCents)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap justify-between gap-2">
                    <span className="rounded-full bg-white/[0.08] px-3 py-2 text-sm text-white/72 ring-1 ring-white/10">
                      {repairStatusLabel(order.repairStatus)}
                    </span>
                    <span className="inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.045] px-3 text-sm text-white/48 shadow-inner-glass transition-[background-color,color] group-hover:bg-white/[0.075] group-hover:text-white">
                      Открыть
                      <ChevronRight aria-hidden="true" size={16} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
        <div ref={sentinelRef} />
        {isLoadingMore ? (
          <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем еще...</p>
        ) : null}
        {!isLoadingInitial && hasMore ? (
          <GhostButton
            className="w-full"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
            type="button"
          >
            Загрузить еще
          </GhostButton>
        ) : null}
        {!isLoadingInitial && orders.length > 0 && !hasMore ? (
          <p className="rounded-lg bg-white/[0.045] p-3 text-center text-sm text-white/42">
            Больше заказов нет.
          </p>
        ) : null}
      </div>
    </div>
  );
}
