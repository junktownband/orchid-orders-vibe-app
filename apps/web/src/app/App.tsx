import { QueryClientProvider } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AuthResponse, AuthUser } from "@orchid/shared";

import {
  authHeaders,
  canAccessBackOffice,
  canChangeRepairStatus,
  canManageReferenceSettings,
  canManageOrders,
  clearStoredAuthSession,
  defaultScreen,
  navItemsForUser,
  ordersQueryFromSearch,
  pathForScreen,
  queryClient,
  readStoredAuthSession,
  request,
  roleLabel,
  screenFromLocation,
  screenForUser,
  screenTitle,
  searchForOrdersQuery,
  validateStoredAuthSession,
  writeStoredAuthSession,
  type AuthStatus,
  type Navigate,
  type OrdersListQuery
} from "./app-core";
import { Background } from "./ui";
import { LoginScreen } from "../features/auth/LoginScreen";

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then(({ DashboardPage }) => ({
    default: DashboardPage
  }))
);
const OrdersListPage = lazy(() =>
  import("../features/orders/OrdersListPage").then(({ OrdersListPage }) => ({
    default: OrdersListPage
  }))
);
const OrderCreatePage = lazy(() =>
  import("../features/orders/OrderCreatePage").then(({ OrderCreatePage }) => ({
    default: OrderCreatePage
  }))
);
const OrderDetailPage = lazy(() =>
  import("../features/orders/OrderDetailPage").then(({ OrderDetailPage }) => ({
    default: OrderDetailPage
  }))
);
const IssueOrderPage = lazy(() =>
  import("../features/orders/IssueOrderPage").then(({ IssueOrderPage }) => ({
    default: IssueOrderPage
  }))
);
const ExpensesListPage = lazy(() =>
  import("../features/expenses/ExpensesPages").then(({ ExpensesListPage }) => ({
    default: ExpensesListPage
  }))
);
const ExpenseCreatePage = lazy(() =>
  import("../features/expenses/ExpensesPages").then(({ ExpenseCreatePage }) => ({
    default: ExpenseCreatePage
  }))
);
const AnalyticsPage = lazy(() =>
  import("../features/analytics/AnalyticsPage").then(({ AnalyticsPage }) => ({
    default: AnalyticsPage
  }))
);
const SettingsProfilePage = lazy(() =>
  import("../features/settings/SettingsProfilePage").then(({ SettingsProfilePage }) => ({
    default: SettingsProfilePage
  }))
);
const TaxSettingsPage = lazy(() =>
  import("../features/settings/TaxSettingsPage").then(({ TaxSettingsPage }) => ({
    default: TaxSettingsPage
  }))
);
const AuditLogPage = lazy(() =>
  import("../features/settings/AuditLogPage").then(({ AuditLogPage }) => ({
    default: AuditLogPage
  }))
);
const MembersSettingsPage = lazy(() =>
  import("../features/settings/MembersSettingsPage").then(({ MembersSettingsPage }) => ({
    default: MembersSettingsPage
  }))
);
const ReferenceSettingsPage = lazy(() =>
  import("../features/settings/ReferenceSettingsPages").then(({ ReferenceSettingsPage }) => ({
    default: ReferenceSettingsPage
  }))
);
const ServicesListPage = lazy(() =>
  import("../features/settings/ServicesPages").then(({ ServicesListPage }) => ({
    default: ServicesListPage
  }))
);
const ServiceCreatePage = lazy(() =>
  import("../features/settings/ServicesPages").then(({ ServiceCreatePage }) => ({
    default: ServiceCreatePage
  }))
);

function ScreenLoading() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.055] p-5 text-sm text-white/55 shadow-inner-glass">
      Загружаем экран...
    </div>
  );
}

function AppShell({
  user,
  accessToken,
  onLogout
}: {
  user: AuthUser;
  accessToken: string;
  onLogout: () => void;
}) {
  const [locationKey, setLocationKey] = useState(
    () => `${window.location.pathname}${window.location.search}`
  );
  const rawScreen = useMemo(() => screenFromLocation(window.location), [locationKey]);
  const screen = useMemo(() => screenForUser(user, rawScreen), [rawScreen, user]);
  const ordersQuery = useMemo(() => ordersQueryFromSearch(window.location.search), [locationKey]);
  const title = screenTitle(screen);
  const shouldReduceMotion = useReducedMotion();
  const visibleNavItems = useMemo(() => navItemsForUser(user), [user]);
  const canUseBackOffice = canAccessBackOffice(user);
  const canManageOrderFlows = canManageOrders(user);
  const canChangeOrderStatus = canChangeRepairStatus(user);
  const canCorrectFinancials = ["OWNER", "ADMIN"].includes(user.role);

  useEffect(() => {
    function handlePopState() {
      setLocationKey(`${window.location.pathname}${window.location.search}`);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback<Navigate>(
    (nextScreen, options) => {
      const path = pathForScreen(nextScreen);
      const search =
        nextScreen.section === "orders" && nextScreen.view === "list"
          ? searchForOrdersQuery(ordersQuery)
          : "";
      const nextUrl = `${path}${search}`;

      if (nextUrl === `${window.location.pathname}${window.location.search}`) {
        return;
      }

      if (options?.replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }

      setLocationKey(nextUrl);
    },
    [ordersQuery]
  );

  const updateOrdersQuery = useCallback(
    (nextQuery: OrdersListQuery, options?: { replace?: boolean }) => {
      const nextUrl = `/orders${searchForOrdersQuery(nextQuery)}`;

      if (options?.replace) {
        window.history.replaceState(null, "", nextUrl);
      } else {
        window.history.pushState(null, "", nextUrl);
      }

      setLocationKey(nextUrl);
    },
    []
  );

  useEffect(() => {
    const safePath = pathForScreen(screen);
    const rawPath = pathForScreen(rawScreen);

    if (safePath !== rawPath) {
      window.history.replaceState(null, "", safePath);
      setLocationKey(safePath);
    }
  }, [rawScreen, screen]);

  async function handleLogout() {
    await request("/api/v1/auth/logout", {
      method: "POST",
      headers: authHeaders(accessToken)
    }).catch(() => undefined);
    onLogout();
  }

  return (
    <Background>
      <div className="relative min-h-screen lg:pl-72">
        <section className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 lg:px-8 lg:pb-10 lg:pt-8 xl:px-12">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-5 lg:pb-6">
            <div className="min-w-0">
              <div className="lg:hidden">
                <p className="text-sm text-white/48">{user.organization.name}</p>
                <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                  Orchid Control
                </h1>
                <p className="mt-1 text-sm text-white/42">{title}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Раздел
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-white">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-48 truncate text-sm font-medium text-white">
                  {user.name ?? user.email}
                </p>
                <p className="mt-1 text-xs text-white/42">{roleLabel(user.role)}</p>
              </div>
              <button
                className="grid h-11 w-11 touch-manipulation place-items-center rounded-md border border-white/10 bg-white/[0.055] text-white shadow-inner-glass transition-[background-color,border-color,box-shadow,transform] hover:border-white/18 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
                aria-label="Выйти из системы"
                onClick={() => void handleLogout()}
                type="button"
              >
                <LogOut aria-hidden="true" size={20} />
              </button>
            </div>
          </header>

          <motion.div
            key={locationKey}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="mt-6 lg:mt-8"
          >
            <Suspense fallback={<ScreenLoading />}>
              {canUseBackOffice && screen.section === "dashboard" ? (
                <DashboardPage accessToken={accessToken} navigate={navigate} />
              ) : null}
              {screen.section === "orders" && screen.view === "list" ? (
                <OrdersListPage
                  accessToken={accessToken}
                  canManageOrders={canManageOrderFlows}
                  navigate={navigate}
                  onQueryChange={updateOrdersQuery}
                  query={ordersQuery}
                />
              ) : null}
              {canManageOrderFlows && screen.section === "orders" && screen.view === "create" ? (
                <OrderCreatePage accessToken={accessToken} navigate={navigate} />
              ) : null}
              {screen.section === "orders" && screen.view === "detail" ? (
                <OrderDetailPage
                  accessToken={accessToken}
                  canChangeRepairStatus={canChangeOrderStatus}
                  canCorrectFinancials={canCorrectFinancials}
                  canManageOrders={canManageOrderFlows}
                  navigate={navigate}
                  orderId={screen.orderId}
                />
              ) : null}
              {canManageOrderFlows && screen.section === "orders" && screen.view === "issue" ? (
                <IssueOrderPage
                  accessToken={accessToken}
                  navigate={navigate}
                  orderId={screen.orderId}
                />
              ) : null}
              {canUseBackOffice && screen.section === "expenses" && screen.view === "list" ? (
                <ExpensesListPage accessToken={accessToken} navigate={navigate} />
              ) : null}
              {canUseBackOffice && screen.section === "expenses" && screen.view === "create" ? (
                <ExpenseCreatePage
                  accessToken={accessToken}
                  itemId={screen.itemId}
                  navigate={navigate}
                  orderId={screen.orderId}
                />
              ) : null}
              {canUseBackOffice && screen.section === "analytics" ? (
                <AnalyticsPage accessToken={accessToken} user={user} />
              ) : null}
              {canUseBackOffice && screen.section === "settings" && screen.view === "profile" ? (
                <SettingsProfilePage user={user} navigate={navigate} onLogout={handleLogout} />
              ) : null}
              {canUseBackOffice && screen.section === "settings" && screen.view === "tax" ? (
                <TaxSettingsPage accessToken={accessToken} navigate={navigate} user={user} />
              ) : null}
              {canUseBackOffice && screen.section === "settings" && screen.view === "audit" ? (
                <AuditLogPage accessToken={accessToken} navigate={navigate} />
              ) : null}
              {canManageReferenceSettings(user) &&
              screen.section === "settings" &&
              screen.view === "members" ? (
                <MembersSettingsPage accessToken={accessToken} navigate={navigate} user={user} />
              ) : null}
              {canManageReferenceSettings(user) &&
              screen.section === "settings" &&
              screen.view === "payment-methods" ? (
                <ReferenceSettingsPage
                  accessToken={accessToken}
                  kind="payment-methods"
                  navigate={navigate}
                />
              ) : null}
              {canManageReferenceSettings(user) &&
              screen.section === "settings" &&
              screen.view === "expense-categories" ? (
                <ReferenceSettingsPage
                  accessToken={accessToken}
                  kind="expense-categories"
                  navigate={navigate}
                />
              ) : null}
              {canUseBackOffice && screen.section === "settings" && screen.view === "services" ? (
                <ServicesListPage accessToken={accessToken} navigate={navigate} />
              ) : null}
              {canUseBackOffice &&
              screen.section === "settings" &&
              screen.view === "service-create" ? (
                <ServiceCreatePage accessToken={accessToken} navigate={navigate} />
              ) : null}
            </Suspense>
          </motion.div>
        </section>

        <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex w-[min(92vw,640px)] -translate-x-1/2 flex-col rounded-lg border border-white/[0.08] bg-panel/92 p-2 shadow-glass backdrop-blur-xl lg:bottom-0 lg:left-0 lg:top-0 lg:h-dvh lg:w-72 lg:translate-x-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:bg-panel/96 lg:p-5 lg:shadow-none">
          <div className="hidden lg:block">
            <p className="text-sm text-white/46">{user.organization.name}</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-white">Orchid Control</p>
            <p className="mt-2 text-sm leading-5 text-white/42">Локальная версия</p>
          </div>

          <div
            className="grid w-full gap-1 lg:mt-8 lg:flex lg:flex-1 lg:flex-col lg:gap-2"
            style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}
          >
            {visibleNavItems.map((item) => (
              <button
                key={item.section}
                aria-current={screen.section === item.section ? "page" : undefined}
                aria-label={item.label}
                className={`grid h-14 touch-manipulation place-items-center gap-1 rounded-md px-1 py-2 text-[11px] transition-[background,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px lg:flex lg:h-11 lg:w-full lg:justify-start lg:gap-3 lg:px-3 lg:py-0 lg:text-sm ${
                  screen.section === item.section
                    ? "button-glass-active"
                    : "border border-transparent text-white/62 hover:border-white/[0.1] hover:bg-white/[0.075] hover:text-white"
                }`}
                onClick={() => navigate(defaultScreen(item.section))}
                type="button"
              >
                <item.icon aria-hidden="true" size={19} />
                <span className="block max-w-full truncate text-[10px] leading-none sm:text-[11px] lg:text-sm lg:leading-5">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto hidden border-t border-white/[0.07] pt-4 lg:block">
            <p className="truncate text-sm font-medium text-white">{user.name ?? user.email}</p>
            <p className="mt-1 text-xs text-white/42">{roleLabel(user.role)}</p>
          </div>
        </nav>
      </div>
    </Background>
  );
}

function OrchidApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    request<AuthResponse>("/api/v1/auth/refresh", {
      method: "POST"
    })
      .then((response) => {
        if (!cancelled) {
          writeStoredAuthSession(response);
          setAccessToken(response.accessToken);
          setUser(response.user);
          setAuthStatus("authenticated");
        }
      })
      .catch(async () => {
        const storedSession = readStoredAuthSession();
        const validatedSession = storedSession
          ? await validateStoredAuthSession(storedSession)
          : null;

        if (!cancelled) {
          if (validatedSession) {
            writeStoredAuthSession(validatedSession);
            setAccessToken(validatedSession.accessToken);
            setUser(validatedSession.user);
            setAuthStatus("authenticated");
          } else {
            setAuthStatus("guest");
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authStatus === "checking") {
    return (
      <Background>
        <div className="relative grid min-h-screen place-items-center px-6 text-white/60">
          Проверяем сессию...
        </div>
      </Background>
    );
  }

  if (authStatus === "guest" || !user || !accessToken) {
    return (
      <LoginScreen
        onLogin={(response) => {
          writeStoredAuthSession(response);
          setAccessToken(response.accessToken);
          setUser(response.user);
          setAuthStatus("authenticated");
        }}
      />
    );
  }

  return (
    <AppShell
      accessToken={accessToken}
      user={user}
      onLogout={() => {
        clearStoredAuthSession();
        setAccessToken(null);
        setUser(null);
        setAuthStatus("guest");
      }}
    />
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OrchidApp />
    </QueryClientProvider>
  );
}
