import { useEffect, useState } from "react";

import type { AuditLogListResponse, AuditLogResponse } from "@orchid/shared";

import {
  auditActionLabel,
  auditActionTone,
  auditDetails,
  auditEntityLabel,
  authHeaders,
  dateTime,
  request,
  shortId,
  type Screen
} from "../../app/app-core";
import { GhostButton, GlassPanel, PageToolbar, SelectField, StatusPill } from "../../app/ui";

type AuditFilters = {
  entityType: string;
  action: AuditLogResponse["action"] | "";
};
type AuditMode = "settings" | "money";
type AuditScope = "finance";
type EntityTypeOption = {
  value: string;
  label: string;
};

const emptyFilters: AuditFilters = {
  entityType: "",
  action: ""
};

const entityTypeOptions: EntityTypeOption[] = [
  { value: "RepairOrder", label: "Заказы" },
  { value: "RepairOrderItem", label: "Позиции заказов" },
  { value: "Expense", label: "Расходы" },
  { value: "ServiceCatalogItem", label: "Каталог услуг" },
  { value: "PaymentMethod", label: "Способы оплаты" },
  { value: "ExpenseCategory", label: "Категории расходов" },
  { value: "Membership", label: "Мастера" },
  { value: "OrganizationSetting", label: "Настройки организации" },
  { value: "Customer", label: "Клиенты" }
];

const financeEntityTypeOptions: EntityTypeOption[] = [
  { value: "FinanceOperation", label: "Ручные операции" },
  { value: "Expense", label: "Расходы" },
  { value: "RepairOrder", label: "Заказы и оплаты" },
  { value: "RepairOrderItem", label: "Выплаты мастерам" },
  { value: "PaymentMethod", label: "Способы оплаты" },
  { value: "ExpenseCategory", label: "Статьи расходов" }
];

const auditActionValues: AuditLogResponse["action"][] = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VOID",
  "CONFIRM",
  "LOGIN",
  "STATUS_CHANGE",
  "PAYMENT_ADDED",
  "PAYMENT_VOIDED",
  "ISSUE",
  "COMMISSION_PAID",
  "COMMISSION_OVERRIDE"
];

const auditActionOptions = auditActionValues.map((action) => ({
  value: action,
  label: auditActionLabel(action)
}));

function auditFiltersFromSearch(search: string, availableEntityTypeOptions: EntityTypeOption[]): AuditFilters {
  const params = new URLSearchParams(search);
  const entityType = params.get("entityType");
  const action = params.get("action");

  return {
    entityType: availableEntityTypeOptions.some((option) => option.value === entityType) ? entityType ?? "" : "",
    action: auditActionOptions.some((option) => option.value === action) ? (action as AuditLogResponse["action"]) : ""
  };
}

function searchForAuditFilters(filters: AuditFilters) {
  const params = new URLSearchParams();

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  const search = params.toString();

  return search ? `?${search}` : "";
}

function requestPathForAudit(filters: AuditFilters, scope?: AuditScope) {
  const params = new URLSearchParams();

  params.set("limit", "50");

  if (scope) {
    params.set("scope", scope);
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  return `/api/v1/audit?${params.toString()}`;
}

function hasActiveFilters(filters: AuditFilters) {
  return filters.entityType !== emptyFilters.entityType || filters.action !== emptyFilters.action;
}

export function AuditLogPage({
  accessToken,
  navigate,
  mode = "settings"
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
  mode?: AuditMode;
}) {
  const isMoneyMode = mode === "money";
  const availableEntityTypeOptions = isMoneyMode ? financeEntityTypeOptions : entityTypeOptions;
  const scope = isMoneyMode ? "finance" : undefined;
  const basePath = isMoneyMode ? "/money/audit" : "/settings/audit";
  const title = isMoneyMode ? "Финансовый журнал" : "Журнал";
  const backScreen: Screen = isMoneyMode
    ? { section: "money", view: "overview" }
    : { section: "settings", view: "profile" };
  const [items, setItems] = useState<AuditLogResponse[]>([]);
  const [filters, setFilters] = useState<AuditFilters>(() =>
    auditFiltersFromSearch(window.location.search, availableEntityTypeOptions)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError(null);
    request<AuditLogListResponse>(requestPathForAudit(filters, scope), {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        if (isActive) {
          setItems(response.items);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Не удалось загрузить журнал.");
          setItems([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, filters, scope]);

  useEffect(() => {
    function handlePopState() {
      setFilters(auditFiltersFromSearch(window.location.search, availableEntityTypeOptions));
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [availableEntityTypeOptions]);

  function updateFilters(patch: Partial<AuditFilters>) {
    setFilters((current) => {
      const next = {
        ...current,
        ...patch
      };

      window.history.replaceState(null, "", `${basePath}${searchForAuditFilters(next)}`);

      return next;
    });
  }

  return (
    <div>
      <PageToolbar back={() => navigate(backScreen)} count={items.length} title={title} />
      <GlassPanel className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <SelectField
            label="Сущность"
            onChange={(event) => updateFilters({ entityType: event.target.value })}
            value={filters.entityType}
          >
            <option value="">Все сущности</option>
            {availableEntityTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Действие"
            onChange={(event) => updateFilters({ action: event.target.value as AuditFilters["action"] })}
            value={filters.action}
          >
            <option value="">Все действия</option>
            {auditActionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <div className="flex items-end">
            <GhostButton
              className="w-full"
              disabled={!hasActiveFilters(filters)}
              onClick={() => updateFilters(emptyFilters)}
              type="button"
            >
              Сбросить
            </GhostButton>
          </div>
        </div>
      </GlassPanel>
      <div className="grid gap-3">
        {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем события...</p> : null}
        {error ? (
          <GlassPanel className="p-5">
            <p className="text-coral">{error}</p>
          </GlassPanel>
        ) : null}
        {!isLoading && !error && items.length === 0 ? (
          <GlassPanel className="p-5">
            <p className="text-white/62">В журнале пока нет событий.</p>
          </GlassPanel>
        ) : null}
        {items.map((item) => {
          const details = auditDetails(item.afterJson ?? item.beforeJson);

          return (
            <GlassPanel key={item.id} as="article" className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={auditActionLabel(item.action)} tone={auditActionTone(item.action)} />
                    <span className="text-sm text-white/45">{dateTime(item.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">
                    {auditEntityLabel(item.entityType)} · {shortId(item.entityId)}
                  </h3>
                  <p className="mt-1 text-sm text-white/55">
                    {item.userName ? `Автор: ${item.userName}` : "Системное событие"}
                    {item.comment ? ` · ${item.comment}` : ""}
                  </p>
                </div>
              </div>
              {details ? (
                <pre className="mt-3 max-h-44 overflow-auto rounded-md bg-black/20 p-3 text-xs leading-5 text-white/58 ring-1 ring-white/[0.08]">
                  {details}
                </pre>
              ) : null}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
