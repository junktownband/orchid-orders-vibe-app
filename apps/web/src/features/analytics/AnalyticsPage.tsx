import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AuthUser,
  CommissionPayoutStatus,
  MasterCommissionBulkPayoutResponse,
  MasterCommissionListResponse,
  MasterCommissionResponse,
  MasterListResponse
} from "@orchid/shared";

import { authHeaders, dateTime, displayOrderNumber, money, percent, recentDateRange, request } from "../../app/app-core";
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
  TextField
} from "../../app/ui";

type PayoutFilters = {
  masterMembershipId: string;
  payoutStatus: CommissionPayoutStatus | "";
  from: string;
  to: string;
};

type CommissionGroup = {
  key: string;
  masterName: string;
  items: MasterCommissionResponse[];
  accruedCents: number;
  paidCents: number;
  unpaidCents: number;
};

type BulkPayoutTarget = {
  title: string;
  items: MasterCommissionResponse[];
};

const payoutStatusOptions: Array<{ value: CommissionPayoutStatus; label: string }> = [
  { value: "UNPAID", label: "К выплате" },
  { value: "PAID", label: "Выплачено" }
];

function defaultPayoutFilters(): PayoutFilters {
  return {
    masterMembershipId: "",
    payoutStatus: "UNPAID",
    ...recentDateRange(60)
  };
}

function pathForCommissionFilters(filters: PayoutFilters) {
  const params = new URLSearchParams();

  if (filters.masterMembershipId) {
    params.set("masterMembershipId", filters.masterMembershipId);
  }

  if (filters.payoutStatus) {
    params.set("payoutStatus", filters.payoutStatus);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  const search = params.toString();

  return search ? `/api/v1/commissions?${search}` : "/api/v1/commissions";
}

function searchForPayoutFilters(filters: PayoutFilters) {
  const params = new URLSearchParams();

  if (filters.masterMembershipId) {
    params.set("masterMembershipId", filters.masterMembershipId);
  }

  if (filters.payoutStatus) {
    params.set("payoutStatus", filters.payoutStatus);
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  const search = params.toString();

  return search ? `?${search}` : "";
}

function payoutFiltersFromSearch(search: string): PayoutFilters {
  const params = new URLSearchParams(search);
  const payoutStatus = params.get("payoutStatus");
  const defaults = defaultPayoutFilters();

  return {
    masterMembershipId: params.get("masterMembershipId") ?? "",
    payoutStatus: payoutStatusOptions.some((option) => option.value === payoutStatus)
      ? (payoutStatus as CommissionPayoutStatus)
      : defaults.payoutStatus,
    from: params.get("from") ?? defaults.from,
    to: params.get("to") ?? defaults.to
  };
}

function groupCommissions(commissions: MasterCommissionListResponse | null): CommissionGroup[] {
  const groups = new Map<string, CommissionGroup>();

  for (const commission of commissions?.items ?? []) {
    const key = commission.masterMembershipId ?? "unassigned";
    const group = groups.get(key) ?? {
      key,
      masterName: commission.masterName ?? "Мастер не выбран",
      items: [],
      accruedCents: 0,
      paidCents: 0,
      unpaidCents: 0
    };

    group.items.push(commission);
    group.accruedCents += commission.commissionAmountCents;

    if (commission.commissionPayoutStatus === "PAID") {
      group.paidCents += commission.commissionAmountCents;
    } else {
      group.unpaidCents += commission.commissionAmountCents;
    }

    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function hasActiveFilters(filters: PayoutFilters) {
  const defaults = defaultPayoutFilters();

  return (
    filters.masterMembershipId !== defaults.masterMembershipId ||
    filters.payoutStatus !== defaults.payoutStatus ||
    filters.from !== defaults.from ||
    filters.to !== defaults.to
  );
}

function CommissionTable({
  canManage,
  items,
  payingCommissionId,
  onMarkPaid
}: {
  canManage: boolean;
  items: MasterCommissionResponse[];
  payingCommissionId: string | null;
  onMarkPaid: (commission: MasterCommissionResponse) => void;
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-white/[0.08] bg-black/15 shadow-inner-glass">
      <table aria-label="Реестр комиссий" className="w-full min-w-[780px] table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[12%]" />
          <col className="w-[20%]" />
          <col className="w-[13%]" />
          <col className="w-[13%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="bg-white/[0.055] text-xs uppercase text-white/42">
          <tr>
            <th className="px-3 py-3 font-medium" scope="col">
              Заказ
            </th>
            <th className="px-3 py-3 font-medium" scope="col">
              Услуга
            </th>
            <th className="px-3 py-3 font-medium" scope="col">
              Мастер
            </th>
            <th className="px-3 py-3 font-medium" scope="col">
              Клиент
            </th>
            <th className="px-3 py-3 font-medium" scope="col">
              Статус
            </th>
            <th className="px-3 py-3 text-right font-medium" scope="col">
              База
            </th>
            <th className="px-3 py-3 text-right font-medium" scope="col">
              К выплате
            </th>
            <th className="px-3 py-3 text-right font-medium" scope="col">
              Действие
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.08]">
          {items.map((commission) => (
            <tr key={commission.id} className="align-top">
              <td className="px-3 py-3 text-white/72">
                <div className="truncate font-medium text-white">{displayOrderNumber(commission.repairOrderNumber)}</div>
                <div className="mt-1 text-xs text-white/40">
                  {commission.issuedAt ? `Закрыт ${dateTime(commission.issuedAt)}` : "Дата выдачи не указана"}
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="truncate font-medium text-white">{commission.repairOrderItemName}</div>
                <div className="mt-1 text-xs text-white/40">
                  Начислено {commission.commissionCalculatedAt ? dateTime(commission.commissionCalculatedAt) : "—"}
                </div>
              </td>
              <td className="truncate px-3 py-3 text-white/62">{commission.masterName ?? "Мастер не выбран"}</td>
              <td className="truncate px-3 py-3 text-white/62">{commission.customerName ?? "Клиент не указан"}</td>
              <td className="px-3 py-3">
                <StatusPill
                  label={commission.commissionPayoutStatus === "PAID" ? "Выплачено" : "К выплате"}
                  tone={commission.commissionPayoutStatus === "PAID" ? "mint" : "amber"}
                />
                {commission.commissionPaidAt ? (
                  <div className="mt-2 text-xs leading-5 text-white/40">
                    Оплатил {commission.commissionPaidByName ?? "пользователь"} {dateTime(commission.commissionPaidAt)}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-white/72">
                <div>{money(commission.commissionBaseCents)}</div>
                {commission.commissionPercentSnapshot !== null ? (
                  <div className="mt-1 text-xs text-white/40">{percent(commission.commissionPercentSnapshot * 100)}%</div>
                ) : null}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-white">
                {money(commission.commissionAmountCents)}
              </td>
              <td className="px-3 py-3 text-right">
                {canManage && commission.commissionPayoutStatus === "UNPAID" ? (
                  <PrimaryButton
                    className="h-9 px-2 text-xs"
                    disabled={payingCommissionId === commission.id}
                    onClick={() => onMarkPaid(commission)}
                    type="button"
                  >
                    {payingCommissionId === commission.id ? "Проводим..." : "Оплатить"}
                  </PrimaryButton>
                ) : (
                  <span className="text-white/35">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsPage({ accessToken, user }: { accessToken: string; user: AuthUser }) {
  const [commissions, setCommissions] = useState<MasterCommissionListResponse | null>(null);
  const [masters, setMasters] = useState<MasterListResponse["items"]>([]);
  const [filters, setFilters] = useState<PayoutFilters>(() => payoutFiltersFromSearch(window.location.search));
  const [isCommissionsLoading, setIsCommissionsLoading] = useState(true);
  const [isMastersLoading, setIsMastersLoading] = useState(true);
  const [commissionToPay, setCommissionToPay] = useState<MasterCommissionResponse | null>(null);
  const [bulkPayoutTarget, setBulkPayoutTarget] = useState<BulkPayoutTarget | null>(null);
  const [payingCommissionId, setPayingCommissionId] = useState<string | null>(null);
  const [isBulkPaying, setIsBulkPaying] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const canManageCommissions = ["OWNER", "ADMIN"].includes(user.role);
  const commissionGroups = useMemo(() => groupCommissions(commissions), [commissions]);
  const unpaidCommissions = useMemo(
    () => (commissions?.items ?? []).filter((commission) => commission.commissionPayoutStatus === "UNPAID"),
    [commissions]
  );

  const refreshCommissions = useCallback(() => {
    if (!canManageCommissions) {
      setIsCommissionsLoading(false);
      return Promise.resolve();
    }

    setIsCommissionsLoading(true);

    return request<MasterCommissionListResponse>(pathForCommissionFilters(filters), {
      headers: authHeaders(accessToken)
    })
      .then((response) => setCommissions(response))
      .catch(() => setCommissions(null))
      .finally(() => setIsCommissionsLoading(false));
  }, [accessToken, canManageCommissions, filters]);

  useEffect(() => {
    if (!canManageCommissions) {
      setIsMastersLoading(false);
      return undefined;
    }

    let cancelled = false;

    setIsMastersLoading(true);
    request<MasterListResponse>("/api/v1/repair-orders/masters", {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        if (!cancelled) {
          setMasters(response.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMasters([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsMastersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, canManageCommissions]);

  useEffect(() => {
    void refreshCommissions();
  }, [refreshCommissions]);

  useEffect(() => {
    function handlePopState() {
      setFilters(payoutFiltersFromSearch(window.location.search));
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function updateFilters(patch: Partial<PayoutFilters>) {
    setFilters((current) => {
      const next = {
        ...current,
        ...patch
      };

      window.history.replaceState(null, "", `/analytics${searchForPayoutFilters(next)}`);

      return next;
    });
  }

  async function markCommissionPaid(commission: MasterCommissionResponse) {
    setPayoutError(null);
    setPayingCommissionId(commission.id);

    try {
      await request<MasterCommissionResponse>(`/api/v1/commissions/${commission.id}/mark-paid`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: "{}"
      });
      setCommissionToPay(null);
      await refreshCommissions();
    } catch {
      setPayoutError("Не удалось провести выплату. Комиссия могла быть оплачена ранее.");
    } finally {
      setPayingCommissionId(null);
    }
  }

  async function markCommissionsPaid(target: BulkPayoutTarget) {
    setPayoutError(null);
    setIsBulkPaying(true);

    try {
      await request<MasterCommissionBulkPayoutResponse>("/api/v1/commissions/bulk-mark-paid", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          repairOrderItemIds: target.items.map((commission) => commission.id)
        })
      });
      setBulkPayoutTarget(null);
      await refreshCommissions();
    } catch {
      setPayoutError("Не удалось провести массовую выплату. Обновите реестр.");
    } finally {
      setIsBulkPaying(false);
    }
  }

  if (!canManageCommissions) {
    return (
      <div>
        <PageToolbar title="Выплаты мастерам" />
        <GlassPanel className="p-5">
          <p className="text-white/62">Раздел доступен владельцу и администратору.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div>
      <PageToolbar
        action={
          <GhostButton disabled={isCommissionsLoading} onClick={() => void refreshCommissions()} type="button">
            <RotateCcw aria-hidden="true" size={16} />
            Обновить
          </GhostButton>
        }
        count={commissions?.items.length ?? 0}
        title="Выплаты мастерам"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Начислено" tone="text-mint" value={money(commissions?.totals.accruedCents ?? 0)} />
        <MetricCard label="Выплачено" value={money(commissions?.totals.paidCents ?? 0)} />
        <MetricCard
          label="К выплате"
          tone="text-amber"
          value={money(commissions?.totals.unpaidCents ?? 0)}
        />
      </div>

      <GlassPanel className="mt-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_auto]">
          <SelectField
            disabled={isMastersLoading}
            label="Мастер"
            onChange={(event) => updateFilters({ masterMembershipId: event.target.value })}
            value={filters.masterMembershipId}
          >
            <option value="">Все мастера</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Статус"
            onChange={(event) => updateFilters({ payoutStatus: event.target.value as CommissionPayoutStatus | "" })}
            value={filters.payoutStatus}
          >
            <option value="">Все статусы</option>
            {payoutStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Начислено с"
            onChange={(event) => updateFilters({ from: event.target.value })}
            type="date"
            value={filters.from}
          />
          <TextField
            label="Начислено по"
            onChange={(event) => updateFilters({ to: event.target.value })}
            type="date"
            value={filters.to}
          />
          <div className="flex items-end">
            <GhostButton
              className="w-full"
              disabled={!hasActiveFilters(filters)}
              onClick={() => updateFilters(defaultPayoutFilters())}
              type="button"
            >
              Сбросить
            </GhostButton>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="mt-4 min-w-0 overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/48">Реестр</p>
            <h3 className="mt-1 text-2xl font-semibold">Реестр комиссий</h3>
          </div>
          <div className="text-right text-sm">
            <p className="text-white/48">Строк</p>
            <strong className="mt-1 block text-xl font-semibold">{commissions?.items.length ?? 0}</strong>
            {unpaidCommissions.length > 0 ? (
              <PrimaryButton
                className="mt-3 h-10 px-3"
                disabled={isBulkPaying}
                onClick={() =>
                  setBulkPayoutTarget({
                    title: "текущая выборка",
                    items: unpaidCommissions
                  })
                }
                type="button"
              >
                Оплатить выборку
              </PrimaryButton>
            ) : null}
          </div>
        </div>

        {payoutError ? <p className="mt-4 rounded-lg bg-coral/12 p-3 text-sm text-coral">{payoutError}</p> : null}
        {isCommissionsLoading ? <p className="mt-4 rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем комиссии...</p> : null}
        {!isCommissionsLoading && commissionGroups.length === 0 ? (
          <p className="mt-4 rounded-lg bg-white/[0.055] p-4 text-sm text-white/55 ring-1 ring-white/[0.08]">
            По выбранным фильтрам комиссий нет.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4">
          {commissionGroups.map((group) => (
            <section key={group.key} className="min-w-0 rounded-lg bg-white/[0.045] p-4 ring-1 ring-white/[0.08]">
              <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,460px)] lg:items-start">
                <div>
                  <p className="text-sm text-white/48">Мастер</p>
                  <h4 className="mt-1 text-xl font-semibold">{group.masterName}</h4>
                  <p className="mt-1 text-sm text-white/42">Позиций: {group.items.length}</p>
                </div>
                <div className="grid min-w-0 gap-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <InlineStat label="Начислено" tone="text-mint" value={money(group.accruedCents)} />
                    <InlineStat label="Выплачено" value={money(group.paidCents)} />
                    <InlineStat label="К выплате" tone="text-amber" value={money(group.unpaidCents)} />
                  </div>
                  {group.unpaidCents > 0 ? (
                    <GhostButton
                      className="justify-center"
                      disabled={isBulkPaying}
                      onClick={() =>
                        setBulkPayoutTarget({
                          title: group.masterName,
                          items: group.items.filter((commission) => commission.commissionPayoutStatus === "UNPAID")
                        })
                      }
                      type="button"
                    >
                      Оплатить мастера
                    </GhostButton>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 min-w-0">
                <CommissionTable
                  canManage={canManageCommissions}
                  items={group.items}
                  onMarkPaid={setCommissionToPay}
                  payingCommissionId={payingCommissionId}
                />
              </div>
            </section>
          ))}
        </div>
      </GlassPanel>

      {commissionToPay ? (
        <ConfirmDialog
          confirmLabel="Создать выплату"
          isBusy={payingCommissionId === commissionToPay.id}
          onCancel={() => setCommissionToPay(null)}
          onConfirm={() => void markCommissionPaid(commissionToPay)}
          title="Подтвердить выплату мастеру?"
        >
          <div className="grid gap-3">
            <p>
              Расход <strong className="text-white">Зарплата</strong>:{" "}
              <strong className="text-white">{money(commissionToPay.commissionAmountCents)}</strong>.
            </p>
            <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
              <p className="text-white">{commissionToPay.masterName ?? "Мастер не выбран"}</p>
              <p className="mt-1 text-white/55">
                {displayOrderNumber(commissionToPay.repairOrderNumber)} · {commissionToPay.repairOrderItemName}
              </p>
              <p className="mt-1 text-white/45">
                База {money(commissionToPay.commissionBaseCents)}
                {commissionToPay.commissionPercentSnapshot !== null
                  ? ` · ${percent(commissionToPay.commissionPercentSnapshot * 100)}%`
                  : ""}
              </p>
            </div>
          </div>
        </ConfirmDialog>
      ) : null}

      {bulkPayoutTarget ? (
        <ConfirmDialog
          confirmLabel="Создать выплаты"
          isBusy={isBulkPaying}
          onCancel={() => setBulkPayoutTarget(null)}
          onConfirm={() => void markCommissionsPaid(bulkPayoutTarget)}
          title="Подтвердить массовую выплату?"
        >
          <div className="grid gap-3">
            <p>
              Расходы <strong className="text-white">Зарплата</strong>:{" "}
              <strong className="text-white">{bulkPayoutTarget.items.length}</strong>.
            </p>
            <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
              <p className="text-white">{bulkPayoutTarget.title}</p>
              <p className="mt-1 text-white/55">
                Сумма выплат:{" "}
                {money(bulkPayoutTarget.items.reduce((sum, commission) => sum + commission.commissionAmountCents, 0))}
              </p>
            </div>
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
