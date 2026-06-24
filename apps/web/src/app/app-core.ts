import { QueryClient } from "@tanstack/react-query";
import { BarChart3, ClipboardList, Search, Settings, WalletCards } from "lucide-react";

import {
  type AuditLogResponse,
  type AuthUser,
  type FieldError,
  type RepairOrderItemInput,
  type RepairOrderResponse,
  type RepairOrderTab,
  type ServiceCatalogItemResponse
} from "@orchid/shared";

import { ApiClientError, apiRequest } from "../shared/api/client";

export { ApiClientError };
export const request = apiRequest;

export const queryClient = new QueryClient();
export const authSessionStorageKey = "orchid_auth_session_v1";

export type MainSection = "dashboard" | "orders" | "expenses" | "analytics" | "settings";
export type Screen =
  | { section: "dashboard" }
  | { section: "orders"; view: "list" | "create" | "detail" | "issue"; orderId?: string }
  | { section: "expenses"; view: "list" | "create"; orderId?: string; itemId?: string }
  | { section: "analytics" }
  | {
      section: "settings";
      view:
        | "profile"
        | "services"
        | "service-create"
        | "tax"
        | "audit"
        | "members"
        | "payment-methods"
        | "expense-categories";
    };
export type AuthStatus = "checking" | "guest" | "authenticated";
export type ServiceType = RepairOrderItemInput["type"];
export type RepairStatus = RepairOrderResponse["repairStatus"];
export type PaymentStatus = RepairOrderResponse["paymentStatus"];
export type TaxSubject = NonNullable<RepairOrderResponse["taxSubject"]>;
export type Icon = typeof ClipboardList;
export type Navigate = (screen: Screen, options?: { replace?: boolean }) => void;
export type OrdersListQuery = {
  q: string;
  tab: RepairOrderTab;
  repairStatus: RepairStatus | "";
  paymentStatus: PaymentStatus | "";
};
export type StoredAuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type DraftOrderItem = {
  id?: string;
  localId: string;
  serviceCatalogItemId?: string;
  assignedMasterMembershipId?: string | null;
  name: string;
  type: ServiceType;
  priceRub: string;
  costRub: string;
};

export const navItems: Array<{ section: MainSection; label: string; icon: Icon }> = [
  { section: "dashboard", label: "Главная", icon: BarChart3 },
  { section: "orders", label: "Заказы", icon: ClipboardList },
  { section: "expenses", label: "Расходы", icon: WalletCards },
  { section: "analytics", label: "Выплаты", icon: Search },
  { section: "settings", label: "Настройки", icon: Settings }
];

export function canManageOrders(user: Pick<AuthUser, "role">) {
  return ["OWNER", "ADMIN", "MANAGER"].includes(user.role);
}

export function canChangeRepairStatus(user: Pick<AuthUser, "role">) {
  return ["OWNER", "ADMIN", "MANAGER", "MASTER"].includes(user.role);
}

export function canAccessBackOffice(user: Pick<AuthUser, "role">) {
  return ["OWNER", "ADMIN", "MANAGER"].includes(user.role);
}

export function canManageReferenceSettings(user: Pick<AuthUser, "role">) {
  return ["OWNER", "ADMIN"].includes(user.role);
}

export function roleLabel(role: AuthUser["role"]) {
  if (role === "OWNER" || role === "ADMIN") {
    return "Админ";
  }

  if (role === "MANAGER") {
    return "Менеджер";
  }

  if (role === "MASTER") {
    return "Мастер";
  }

  return role;
}

export function navItemsForUser(user: Pick<AuthUser, "role">) {
  return canAccessBackOffice(user) ? navItems : navItems.filter((item) => item.section === "orders");
}

export function screenForUser(user: Pick<AuthUser, "role">, screen: Screen): Screen {
  if (canAccessBackOffice(user)) {
    if (
      screen.section === "settings" &&
      ["members", "payment-methods", "expense-categories"].includes(screen.view) &&
      !canManageReferenceSettings(user)
    ) {
      return { section: "settings", view: "profile" };
    }

    return screen;
  }

  if (screen.section === "orders" && (screen.view === "list" || screen.view === "detail")) {
    return screen;
  }

  return { section: "orders", view: "list" };
}

export const serviceTypeOptions: Array<{ value: ServiceType; label: string }> = [
  { value: "SERVICE", label: "Услуга" },
  { value: "MATERIAL", label: "Материал" },
  { value: "PART", label: "Товар/запчасть" },
  { value: "STRINGS", label: "Товар/запчасть" },
  { value: "OTHER", label: "Другое" }
];

export const fixedServiceTypes = new Set<ServiceType>(["SERVICE"]);
export const resaleTypes = new Set<ServiceType>(["MATERIAL", "PART", "STRINGS", "OTHER"]);
export const repairStatusOptions: Array<{ value: RepairOrderResponse["repairStatus"]; label: string }> = [
  { value: "ACCEPTED", label: "Принят" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "READY", label: "Готов" },
  { value: "ISSUED", label: "Выдан" },
  { value: "CANCELLED", label: "Отменен" }
];

export const paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "UNPAID", label: "Не оплачен" },
  { value: "PARTIALLY_PAID", label: "Частично" },
  { value: "PAID", label: "Оплачен" },
  { value: "VOIDED", label: "Отменен" }
];
export const orderTabOptions: Array<{ value: RepairOrderTab; label: string }> = [
  { value: "all", label: "Все" },
  { value: "ready", label: "Готовые" },
  { value: "active", label: "В работе" },
  { value: "completed", label: "Закрытые" }
];

export const taxSubjectOptions: Array<{ value: TaxSubject; label: string; rateBps: 400 | 600; description: string }> = [
  {
    value: "INDIVIDUAL",
    label: "Физическое лицо",
    rateBps: 400,
    description: "4% — с доходов от физических лиц"
  },
  {
    value: "BUSINESS",
    label: "Юрлицо или ИП",
    rateBps: 600,
    description: "6% — с доходов от юридических лиц и индивидуальных предпринимателей"
  }
];

export const quickOrderItems: Array<{ label: string; item: Partial<DraftOrderItem> }> = [
  {
    label: "Нестандартная услуга",
    item: {
      name: "Нестандартная услуга",
      type: "SERVICE",
      priceRub: "",
      costRub: "0"
    }
  },
  {
    label: "Добавить запчасть",
    item: {
      name: "Запчасть",
      type: "PART",
      priceRub: "",
      costRub: ""
    }
  }
];

export type OrderWarning = {
  tone: "amber" | "coral";
  text: string;
};

export function defaultScreen(section: MainSection): Screen {
  if (section === "orders") {
    return { section, view: "list" };
  }

  if (section === "expenses") {
    return { section, view: "list" };
  }

  if (section === "settings") {
    return { section, view: "profile" };
  }

  return { section };
}

export function screenTitle(screen: Screen) {
  if (screen.section === "orders") {
    if (screen.view === "create") {
      return "Новый заказ";
    }

    if (screen.view === "issue") {
      return "Выдача заказа";
    }

    if (screen.view === "detail") {
      return "Карточка заказа";
    }

    return "Заказы";
  }

  if (screen.section === "expenses") {
    return screen.view === "create" ? "Новый расход" : "Расходы";
  }

  if (screen.section === "settings") {
    if (screen.view === "audit") {
      return "Журнал";
    }

    if (screen.view === "members") {
      return "Мастера";
    }

    if (screen.view === "payment-methods") {
      return "Способы оплаты";
    }

    if (screen.view === "expense-categories") {
      return "Категории расходов";
    }

    if (screen.view === "tax") {
      return "Налоги";
    }

    if (screen.view === "services") {
      return "Каталог услуг";
    }

    if (screen.view === "service-create") {
      return "Новая услуга";
    }

    return "Настройки";
  }

  return navItems.find((item) => item.section === screen.section)?.label ?? "Главная";
}

export function screenFromLocation(location: Location): Screen {
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts[0] === "orders") {
    if (parts[1] === "new") {
      return { section: "orders", view: "create" };
    }

    if (parts[1]) {
      return {
        section: "orders",
        view: parts[2] === "issue" ? "issue" : "detail",
        orderId: parts[1]
      };
    }

    return { section: "orders", view: "list" };
  }

  if (parts[0] === "expenses") {
    if (parts[1] === "new") {
      const params = new URLSearchParams(location.search);

      return {
        section: "expenses",
        view: "create",
        orderId: params.get("orderId") ?? undefined,
        itemId: params.get("itemId") ?? undefined
      };
    }

    return { section: "expenses", view: "list" };
  }

  if (parts[0] === "analytics") {
    return { section: "analytics" };
  }

  if (parts[0] === "settings") {
    if (parts[1] === "audit") {
      return { section: "settings", view: "audit" };
    }

    if (parts[1] === "members") {
      return { section: "settings", view: "members" };
    }

    if (parts[1] === "payment-methods") {
      return { section: "settings", view: "payment-methods" };
    }

    if (parts[1] === "expense-categories") {
      return { section: "settings", view: "expense-categories" };
    }

    if (parts[1] === "tax") {
      return { section: "settings", view: "tax" };
    }

    if (parts[1] === "services" && parts[2] === "new") {
      return { section: "settings", view: "service-create" };
    }

    if (parts[1] === "services") {
      return { section: "settings", view: "services" };
    }

    return { section: "settings", view: "profile" };
  }

  return { section: "dashboard" };
}

export function pathForScreen(screen: Screen) {
  if (screen.section === "orders") {
    if (screen.view === "create") {
      return "/orders/new";
    }

    if (screen.view === "detail" && screen.orderId) {
      return `/orders/${screen.orderId}`;
    }

    if (screen.view === "issue" && screen.orderId) {
      return `/orders/${screen.orderId}/issue`;
    }

    return "/orders";
  }

  if (screen.section === "expenses") {
    if (screen.view !== "create") {
      return "/expenses";
    }

    const params = new URLSearchParams();

    if (screen.orderId) {
      params.set("orderId", screen.orderId);
    }

    if (screen.itemId) {
      params.set("itemId", screen.itemId);
    }

    const search = params.toString();

    return search ? `/expenses/new?${search}` : "/expenses/new";
  }

  if (screen.section === "analytics") {
    return "/analytics";
  }

  if (screen.section === "settings") {
    if (screen.view === "audit") {
      return "/settings/audit";
    }

    if (screen.view === "members") {
      return "/settings/members";
    }

    if (screen.view === "payment-methods") {
      return "/settings/payment-methods";
    }

    if (screen.view === "expense-categories") {
      return "/settings/expense-categories";
    }

    if (screen.view === "tax") {
      return "/settings/tax";
    }

    if (screen.view === "service-create") {
      return "/settings/services/new";
    }

    if (screen.view === "services") {
      return "/settings/services";
    }

    return "/settings";
  }

  return "/";
}

export function ordersQueryFromSearch(search: string): OrdersListQuery {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  const repairStatus = params.get("repairStatus");
  const paymentStatus = params.get("paymentStatus");

  return {
    q: params.get("q") ?? "",
    tab: orderTabOptions.some((option) => option.value === tab) ? (tab as RepairOrderTab) : "all",
    repairStatus: repairStatusOptions.some((option) => option.value === repairStatus) ? (repairStatus as RepairStatus) : "",
    paymentStatus: paymentStatusOptions.some((option) => option.value === paymentStatus) ? (paymentStatus as PaymentStatus) : ""
  };
}

export function searchForOrdersQuery(query: OrdersListQuery) {
  const params = new URLSearchParams();

  if (query.q.trim()) {
    params.set("q", query.q.trim());
  }

  if (query.tab !== "all") {
    params.set("tab", query.tab);
  }

  if (query.repairStatus) {
    params.set("repairStatus", query.repairStatus);
  }

  if (query.paymentStatus) {
    params.set("paymentStatus", query.paymentStatus);
  }

  const value = params.toString();

  return value ? `?${value}` : "";
}

export function requestPathForOrders(query: OrdersListQuery, cursor?: string | null) {
  const params = new URLSearchParams(searchForOrdersQuery(query).slice(1));
  params.set("limit", "20");

  if (cursor) {
    params.set("cursor", cursor);
  }

  return `/api/v1/repair-orders?${params.toString()}`;
}

export function readStoredAuthSession(): StoredAuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(authSessionStorageKey);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredAuthSession;

    return parsed.accessToken && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredAuthSession(session: StoredAuthSession) {
  window.sessionStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  window.sessionStorage.removeItem(authSessionStorageKey);
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

export function fieldErrorMap(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return new Map<string, string>();
  }

  const errors: FieldError[] = error.response.error.errors;

  return new Map(errors.map((item) => [item.field, item.message]));
}

export function fieldError(errorMap: Map<string, string>, fields: string[]) {
  for (const field of fields) {
    const message = errorMap.get(field);

    if (message) {
      return message;
    }
  }

  return undefined;
}

export function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

export async function validateStoredAuthSession(session: StoredAuthSession): Promise<StoredAuthSession | null> {
  try {
    const user = await request<AuthUser>("/api/v1/auth/me", {
      headers: authHeaders(session.accessToken)
    });

    return {
      accessToken: session.accessToken,
      user
    };
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function money(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function percent(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1
  }).format(value);
}

export function taxRatePercent(rateBps: number) {
  return `${percent(rateBps / 100)}%`;
}

export function taxAmountFor(finalAmountCents: number, rateBps: number) {
  return Math.round((finalAmountCents * rateBps) / 10000);
}

export function dateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function shortId(value: string) {
  return value.slice(-6).toUpperCase();
}

export function rubToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

export function centsToRubInput(cents: number) {
  const rub = cents / 100;
  return Number.isInteger(rub) ? String(rub) : rub.toFixed(2);
}

export function marginPercentFrom(priceCents: number, costCents: number) {
  return priceCents > 0 ? ((priceCents - costCents) / priceCents) * 100 : 0;
}

export function parsedMoneyOrZero(value: string) {
  const cents = rubToCents(value);
  return Number.isFinite(cents) ? cents : 0;
}

export function parsePercentInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0 || amount > 100) {
    return Number.NaN;
  }

  return amount;
}

export function memberPercentInput(value: number | null) {
  return value === null ? "" : String(value);
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatPhoneInput(value: string) {
  const digits = phoneDigits(value).slice(0, 15);

  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;

  if (!normalized.startsWith("7")) {
    return `+${normalized}`;
  }

  const body = normalized.slice(1);
  const parts = [
    body.slice(0, 3),
    body.slice(3, 6),
    body.slice(6, 8),
    body.slice(8, 10)
  ].filter(Boolean);

  if (parts.length === 1) {
    return `+7 (${parts[0]}`;
  }

  if (parts.length === 2) {
    return `+7 (${parts[0]}) ${parts[1]}`;
  }

  if (parts.length === 3) {
    return `+7 (${parts[0]}) ${parts[1]}-${parts[2]}`;
  }

  return `+7 (${parts[0]}) ${parts[1]}-${parts[2]}-${parts[3]}`;
}

export function serviceTypeLabel(type: ServiceType) {
  return serviceTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function orderNumberCore(orderNumber: string) {
  return orderNumber.replace(/^R-/i, "");
}

export function displayOrderNumber(orderNumber: string) {
  return `№ ${orderNumberCore(orderNumber)}`;
}

export function orderSearchResultTitle(order: RepairOrderResponse) {
  return [displayOrderNumber(order.orderNumber), order.instrumentName ?? order.customerName ?? "заказ"]
    .filter(Boolean)
    .join(" · ");
}

export function isCatalogServiceItem(item: DraftOrderItem) {
  return Boolean(item.serviceCatalogItemId) && item.type === "SERVICE";
}

export function isServiceItem(item: DraftOrderItem) {
  return item.type === "SERVICE";
}

export function draftItemNameLabel(item: DraftOrderItem) {
  return isServiceItem(item) ? "Что делаем" : "Что добавляем";
}

export function draftItemPriceLabel(item: DraftOrderItem) {
  return isServiceItem(item) ? "Цена услуги, ₽" : "Цена клиенту, ₽";
}

export function filterCatalogItems(items: ServiceCatalogItemResponse[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return items
    .filter((item) => !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
}

export function paymentStatusLabel(status: RepairOrderResponse["paymentStatus"]) {
  if (status === "PAID") {
    return "Оплачен";
  }

  if (status === "PARTIALLY_PAID") {
    return "Частично";
  }

  if (status === "VOIDED") {
    return "Отменен";
  }

  return "Не оплачен";
}

export function repairStatusLabel(status: RepairOrderResponse["repairStatus"]) {
  if (status === "ACCEPTED") {
    return "Принят";
  }

  if (status === "IN_PROGRESS") {
    return "В работе";
  }

  if (status === "READY") {
    return "Готов";
  }

  if (status === "ISSUED") {
    return "Выдан";
  }

  return "Отменен";
}

export function auditActionLabel(action: AuditLogResponse["action"]) {
  const labels: Record<AuditLogResponse["action"], string> = {
    CREATE: "Создание",
    UPDATE: "Изменение",
    DELETE: "Удаление",
    VOID: "Отмена",
    CONFIRM: "Подтверждение",
    LOGIN: "Вход",
    STATUS_CHANGE: "Статус заказа",
    PAYMENT_ADDED: "Оплата",
    PAYMENT_VOIDED: "Отмена оплаты",
    ISSUE: "Выдача заказа",
    COMMISSION_PAID: "Выплата мастеру",
    COMMISSION_OVERRIDE: "Комиссия"
  };

  return labels[action];
}

export function auditEntityLabel(entityType: string) {
  if (entityType === "RepairOrder") {
    return "Заказ";
  }

  if (entityType === "Expense") {
    return "Расход";
  }

  if (entityType === "ServiceCatalogItem") {
    return "Каталог услуг";
  }

  if (entityType === "RepairOrderItem") {
    return "Услуга заказа";
  }

  if (entityType === "Membership") {
    return "Мастер";
  }

  if (entityType === "OrganizationSetting") {
    return "Настройки организации";
  }

  return entityType;
}

export function auditDetails(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

export function auditActionTone(action: AuditLogResponse["action"]): "mint" | "amber" | "coral" | "neutral" {
  if (
    action === "CREATE" ||
    action === "CONFIRM" ||
    action === "PAYMENT_ADDED" ||
    action === "ISSUE" ||
    action === "COMMISSION_PAID"
  ) {
    return "mint";
  }

  if (action === "VOID" || action === "DELETE" || action === "PAYMENT_VOIDED") {
    return "coral";
  }

  if (action === "STATUS_CHANGE" || action === "COMMISSION_OVERRIDE") {
    return "amber";
  }

  return "neutral";
}

export function orderWarnings(order: RepairOrderResponse): OrderWarning[] {
  const warnings: OrderWarning[] = [];
  const resaleWithoutCost = order.items.some(
    (item) => resaleTypes.has(item.type) && item.priceCents > 0 && item.costCents === 0
  );

  if (resaleWithoutCost) {
    warnings.push({
      tone: "amber",
      text: "Есть товар без себестоимости"
    });
  }

  if (order.grossProfitCents < 0) {
    warnings.push({
      tone: "coral",
      text: "Отрицательная маржа"
    });
  }

  if (order.repairStatus === "READY" && order.paymentStatus !== "PAID") {
    warnings.push({
      tone: "amber",
      text: "Готов, но не оплачен"
    });
  }

  return warnings;
}

export function createDraftItem(overrides?: Partial<DraftOrderItem>): DraftOrderItem {
  return {
    localId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    name: "",
    type: "SERVICE",
    priceRub: "",
    costRub: "0",
    ...overrides
  };
}

export function draftItemsFromOrder(order: RepairOrderResponse): DraftOrderItem[] {
  return order.items.map((item) =>
    createDraftItem({
      id: item.id,
      localId: item.id,
      serviceCatalogItemId: item.serviceCatalogItemId ?? undefined,
      assignedMasterMembershipId: item.assignedMasterMembershipId,
      name: item.name,
      type: item.type === "STRINGS" ? "PART" : item.type,
      priceRub: centsToRubInput(item.priceCents),
      costRub: centsToRubInput(item.costCents)
    })
  );
}

export function calculateDraftTotals(draftItems: DraftOrderItem[]) {
  return draftItems.reduce(
    (totals, item) => {
      const priceCents = rubToCents(item.priceRub);
      const costCents = rubToCents(item.costRub || "0");

      if (!Number.isFinite(priceCents) || !Number.isFinite(costCents)) {
        return totals;
      }

      return {
        priceCents: totals.priceCents + priceCents,
        costCents: totals.costCents + costCents
      };
    },
    { priceCents: 0, costCents: 0 }
  );
}

export function buildRepairOrderItemsPayload(draftItems: DraftOrderItem[], includeIds = false): Array<RepairOrderItemInput & { id?: string }> {
  return draftItems.map((item) => {
    const priceCents = rubToCents(item.priceRub);
    const costCents = rubToCents(item.costRub || "0");

    if (
      item.name.trim().length < 2 ||
      !Number.isFinite(priceCents) ||
      priceCents <= 0 ||
      !Number.isFinite(costCents) ||
      costCents < 0
    ) {
      throw new Error("Invalid item");
    }

    return {
      ...(includeIds && item.id ? { id: item.id } : {}),
      serviceCatalogItemId: item.serviceCatalogItemId,
      assignedMasterMembershipId: isServiceItem(item) ? (item.assignedMasterMembershipId || null) : null,
      name: item.name.trim(),
      type: item.type,
      priceCents,
      costCents
    };
  });
}
