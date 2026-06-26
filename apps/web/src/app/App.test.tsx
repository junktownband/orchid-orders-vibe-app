import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

import {
  auditLogResponse,
  authResponse,
  commissionsResponse,
  commissionsWithUnpaidResponse,
  dashboardResponse,
  expenseCategoriesResponse,
  expensesResponse,
  financeOverviewResponse,
  jsonResponse,
  mastersResponse,
  membersResponse,
  paymentMethodsResponse,
  paidRepairOrder,
  repairOrderAuditResponse,
  repairOrdersResponse,
  serviceCatalogResponse,
  updatedCustomerResponse
} from "../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

function expectNoMojibake(element: HTMLElement) {
  expect(element.textContent).not.toMatch(/Рџ|РЎ|Рќ|Р—|Р’|Р°|Рµ|СЃ|С‚|СЊ|в‚|Ð|Ñ/);
}

describe("App", () => {
  it("shows login when session refresh fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, { status: 401 }));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("clears a stale stored session when refresh and validation fail", async () => {
    window.sessionStorage.setItem("orchid_auth_session_v1", JSON.stringify(authResponse));

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }));

    render(<App />);

    expect(await screen.findByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("orchid_auth_session_v1")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token"
        })
      })
    );
  });

  it("starts a new expense with order search and an unchecked general expense option", async () => {
    window.history.replaceState(null, "", "/expenses/new");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(expenseCategoriesResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Новый расход" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Общий расход/ })).not.toBeChecked();
    expect(screen.getByLabelText("Найти заказ")).toBeInTheDocument();
  });

  it("logs in and switches bottom navigation pages", async () => {
    const repairOrderWithCatalogItem = {
      ...repairOrdersResponse.items[0],
      balanceDueCents: 2600000,
      grossProfitCents: 2490000,
      items: [
        ...repairOrdersResponse.items[0].items,
        {
          assignedMasterMembershipId: "member-1",
          assignedMasterName: "Owner",
          commissionAmountCents: null,
          commissionBaseCents: null,
          commissionCalculatedAt: null,
          commissionPaidAt: null,
          commissionPaidByName: null,
          commissionPayoutStatus: "UNPAID",
          commissionPercentSnapshot: null,
          costCents: 50000,
          id: "item-3",
          name: "Полная проточка ладов",
          priceCents: 600000,
          serviceCatalogItemId: "service-1",
          type: "SERVICE"
        }
      ],
      totalAmountCents: 2600000,
      totalCostCents: 110000
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse.items[0]))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse(serviceCatalogResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrderWithCatalogItem))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse))
      .mockResolvedValueOnce(jsonResponse(updatedCustomerResponse))
      .mockResolvedValueOnce(jsonResponse(paidRepairOrder))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse));

    const { baseElement } = render(<App />);

    fireEvent.change(await screen.findByLabelText("Пароль"), {
      target: {
        value: "orchid12345"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByLabelText("Заказы")).toBeInTheDocument();
    expect(await screen.findByText("Состояние заказов")).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      expect.objectContaining({
        method: "POST"
      })
    );

    fireEvent.click(screen.getByLabelText("Заказы"));
    expect(await screen.findByRole("heading", { name: "Заказы" })).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(screen.getByLabelText("Заказы")).toHaveAttribute("aria-current", "page");
    expect(await screen.findByText("Fender Stratocaster")).toBeInTheDocument();
    expect(await screen.findByText("Есть товар без себестоимости")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fender Stratocaster.*№ 00001/ }));
    expect(await screen.findByRole("heading", { name: "№ 00001" })).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(screen.getByRole("button", { name: "Выдать заказ" })).toBeInTheDocument();
    expect(screen.getByText("Состояние")).toBeInTheDocument();
    expect(await screen.findByText("Журнал действий")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Полная проточка ладов/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить позицию" }));
    expect(screen.getByRole("heading", { name: "Добавить позицию" })).toBeInTheDocument();
    expect(screen.getByLabelText("Найти стандартную услугу")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Полная проточка ладов/ }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Добавить позицию" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Полная проточка ладов")).toBeInTheDocument();
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/v1/repair-orders/repair-1/items",
          expect.objectContaining({
            method: "PUT"
          })
        );
      },
      { timeout: 2_500 }
    );
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => url === "/api/v1/repair-orders/repair-1/audit")
          .length
      ).toBeGreaterThanOrEqual(2);
    });
    expect(screen.queryByRole("button", { name: "Сохранить заказ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Сохранено")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
    fireEvent.change(await screen.findByLabelText("Имя клиента"), {
      target: {
        value: "Петр"
      }
    });
    expect(screen.queryByRole("button", { name: "Сохранить клиента" })).not.toBeInTheDocument();
    expect(screen.queryByText("Сохранено")).not.toBeInTheDocument();
    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/v1/customers/customer-1",
          expect.objectContaining({
            body: JSON.stringify({
              name: "Петр",
              phone: "+7 (999) 123-45-67",
              email: "ivan@example.test",
              note: "Постоянный клиент"
            }),
            method: "PATCH"
          })
        );
      },
      { timeout: 2_500 }
    );
    expect((await screen.findAllByText("Петр")).length).toBeGreaterThan(0);
    expect(screen.getByText("Действия")).toBeInTheDocument();
    const markPaidButton = screen.getByRole("button", { name: "Принять оплату" });
    expect(markPaidButton).toBeDefined();
    fireEvent.click(markPaidButton as HTMLElement);
    expect(screen.getByRole("heading", { name: "Принять оплату по заказу?" })).toBeInTheDocument();
    const paymentConfirmButtons = screen.getAllByRole("button", { name: "Принять оплату" });
    fireEvent.click(paymentConfirmButtons[paymentConfirmButtons.length - 1] as HTMLElement);
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Принять оплату" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Оплачен").length).toBeGreaterThan(0);

    fetchMock
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(serviceCatalogResponse));
    fireEvent.click(screen.getByLabelText("Заказы"));
    fireEvent.click(screen.getByRole("button", { name: "Новый заказ" }));
    expect(await screen.findByText("Итог заказа")).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(
      await screen.findByRole("button", { name: /Полная проточка ладов/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Нестандартная услуга" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить запчасть" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Добавить струны" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Пустая позиция" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить запчасть" }));
    fireEvent.change(screen.getByLabelText("Цена клиенту, ₽"), {
      target: {
        value: "1000"
      }
    });
    fireEvent.change(screen.getByLabelText("Себестоимость, ₽"), {
      target: {
        value: "400"
      }
    });
    await waitFor(() => {
      expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    });

    fetchMock
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(expensesResponse));
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    expect((await screen.findAllByText("Дебиторка")).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 заказа ждут оплаты/)).toBeInTheDocument();
    expect(await screen.findByText("Наличные и перевод")).toBeInTheDocument();
    expect(await screen.findByText("Наличные")).toBeInTheDocument();
    expect(await screen.findByText("Перевод")).toBeInTheDocument();
    expect(screen.getByText("Стандартные и нестандартные")).toBeInTheDocument();
    expect(screen.getByText("Работы по мастерам")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Расходы" }));
    expect(await screen.findByRole("heading", { name: "Расходы" })).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(screen.getByRole("button", { name: "Новый расход" })).toBeInTheDocument();

    fetchMock
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Выплаты мастерам" }));
    expect(await screen.findByRole("heading", { name: "Выплаты мастерам" })).toBeInTheDocument();
    expectNoMojibake(baseElement);
    expect(await screen.findByText("Реестр комиссий")).toBeInTheDocument();
    expect(screen.getByLabelText("Мастер")).toBeInTheDocument();
    expect(screen.getByLabelText("Начислено с")).toBeInTheDocument();
    expect(
      screen.queryByText("Следить за маржей по работам и перепродаваемым позициям отдельно.")
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Настройки"));
    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();
    expectNoMojibake(baseElement);
    fetchMock.mockResolvedValueOnce(jsonResponse(auditLogResponse));
    fireEvent.click(screen.getByRole("button", { name: /Журнал/ }));
    expect(await screen.findByRole("heading", { name: "Журнал" })).toBeInTheDocument();
    const auditEvent = await screen.findByRole("article");
    expect(within(auditEvent).getByText("Статус заказа")).toBeInTheDocument();
    expect(
      within(auditEvent).getByText(/Repair order status changed to READY/)
    ).toBeInTheDocument();
    expectNoMojibake(baseElement);
    fireEvent.click(screen.getByLabelText("Назад"));
    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(jsonResponse(membersResponse));
    fireEvent.click(screen.getByRole("button", { name: /Мастера/ }));
    expect(await screen.findByRole("heading", { name: "Мастера" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Manager 1")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Master 1")).toBeInTheDocument();
    expect(screen.getByText(/комиссия 30%/)).toBeInTheDocument();
    expectNoMojibake(baseElement);
    fireEvent.click(screen.getByLabelText("Назад"));
    expect(await screen.findByRole("heading", { name: "Настройки" })).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(jsonResponse(serviceCatalogResponse));
    fireEvent.click(screen.getByRole("button", { name: /Каталог услуг/ }));
    expect(await screen.findByRole("heading", { name: "Каталог услуг" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
  }, 10_000);

  it("returns to login on logout", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    render(<App />);

    await screen.findByLabelText("Заказы");
    fireEvent.click(screen.getByLabelText("Настройки"));
    fireEvent.click(await screen.findByRole("button", { name: "Выйти" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    });
  });

  it("opens dedicated money operation dialogs from the finance overview", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: "manual-1",
            source: "MANUAL",
            type: "DEPOSIT",
            direction: "IN",
            amountCents: 25_000,
            signedAmountCents: 25_000,
            occurredAt: "2026-06-12T10:00:00.000Z",
            description: "Пополнение счета",
            paymentMethodId: "payment-method-2",
            paymentMethodName: "Перевод",
            counterpartyName: null,
            repairOrderId: null,
            repairOrderNumber: null,
            createdByName: "Саша",
            comment: null
          },
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    await screen.findByText("Актуально");
    fireEvent.click(screen.getByLabelText("Деньги"));

    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Деньги" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Июнь 2026 г." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Пополнение" }));
    expect(screen.getByRole("heading", { name: "Пополнение счета" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Способ оплаты")).toHaveValue("payment-method-1");
    fireEvent.change(screen.getByLabelText("Способ оплаты"), {
      target: {
        value: "payment-method-2"
      }
    });
    fireEvent.change(screen.getByLabelText("Сумма, ₽"), {
      target: {
        value: "250"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Пополнить" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/finance/operations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            type: "DEPOSIT",
            amountCents: 25_000,
            paymentMethodId: "payment-method-2",
            description: "Пополнение счета",
            comment: undefined
          })
        })
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Списание" }));
    expect(screen.getByRole("heading", { name: "Списание со счета" })).toBeInTheDocument();
    expect(screen.getByLabelText("Обновить деньги")).toBeInTheDocument();
  });

  it("lets a master update only working repair statuses from an order card", async () => {
    const masterAuthResponse = {
      ...authResponse,
      user: {
        ...authResponse.user,
        id: "user-master",
        email: "dima@orchid.local",
        name: "Дима",
        role: "MASTER" as const
      }
    };
    const updatedOrder = {
      ...repairOrdersResponse.items[0],
      repairStatus: "READY" as const
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(masterAuthResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse.items[0]))
      .mockResolvedValueOnce(jsonResponse(updatedOrder));

    window.history.replaceState(null, "", "/orders/repair-1");

    render(<App />);

    const statusSelect = await screen.findByLabelText("Статус");
    expect(statusSelect).toBeEnabled();
    expect(
      Array.from((statusSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toEqual(["ACCEPTED", "IN_PROGRESS", "READY"]);
    expect(within(statusSelect).queryByRole("option", { name: "Выдан" })).not.toBeInTheDocument();
    expect(within(statusSelect).queryByRole("option", { name: "Отменен" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Принять оплату" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Выдать заказ" })).not.toBeInTheDocument();
    expect(screen.queryByText("Журнал действий")).not.toBeInTheDocument();

    fireEvent.change(statusSelect, {
      target: {
        value: "READY"
      }
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/repair-orders/repair-1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            repairStatus: "READY"
          })
        })
      );
    });
  });

  it("creates a bulk master payout from the payout register", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsWithUnpaidResponse))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              ...commissionsWithUnpaidResponse.items[0],
              commissionPayoutStatus: "PAID",
              commissionPaidAt: "2026-06-15T11:00:00.000Z",
              commissionPaidByName: "Owner"
            }
          ],
          paidCount: 1,
          paidCents: 30_000
        })
      )
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Выплаты мастерам" }));
    expect(await screen.findByRole("heading", { name: "Выплаты мастерам" })).toBeInTheDocument();
    const payoutTable = await screen.findByRole("table", { name: "Реестр комиссий" });
    expect(within(payoutTable).getByRole("columnheader", { name: "Заказ" })).toBeInTheDocument();
    expect(within(payoutTable).getByRole("columnheader", { name: "Мастер" })).toBeInTheDocument();
    expect(within(payoutTable).getByRole("columnheader", { name: "База" })).toBeInTheDocument();
    expect(
      within(payoutTable).getByRole("columnheader", { name: "К выплате" })
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Оплатить выборку" }));
    expect(
      screen.getByRole("heading", { name: "Подтвердить массовую выплату?" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Создать выплаты" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/commissions/bulk-mark-paid",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            repairOrderItemIds: ["item-1"]
          })
        })
      );
    });
  });

  it("opens a separate money operations ledger from the overview", async () => {
    window.sessionStorage.setItem("orchid_auth_session_v1", JSON.stringify(authResponse));
    const ledgerOverviewResponse = {
      ...financeOverviewResponse,
      operations: [
        financeOverviewResponse.operations[0],
        {
          id: "manual-1",
          source: "MANUAL",
          type: "WITHDRAWAL",
          direction: "OUT",
          amountCents: 25_000,
          signedAmountCents: -25_000,
          occurredAt: "2026-06-11T10:00:00.000Z",
          description: "Списание на хозяйственные нужды",
          paymentMethodId: "payment-method-2",
          paymentMethodName: "Перевод",
          counterpartyName: null,
          repairOrderId: null,
          repairOrderNumber: null,
          createdByName: "Саша",
          comment: null
        }
      ]
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse(authResponse.user))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(ledgerOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(ledgerOverviewResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Все операции" }));

    expect(await screen.findByRole("heading", { name: "Журнал операций" })).toBeInTheDocument();
    const operation = await screen.findByText("Оплата заказа № 00001");
    expect(operation).toBeInTheDocument();
    expect(screen.getByText("Списание на хозяйственные нужды")).toBeInTheDocument();
    expect(screen.getByText(/Наличные · Петр · Саша/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Движение"), {
      target: {
        value: "OUT"
      }
    });
    expect(screen.queryByText("Оплата заказа № 00001")).not.toBeInTheDocument();
    expect(screen.getByText("Списание на хозяйственные нужды")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Способ оплаты"), {
      target: {
        value: "Наличные"
      }
    });
    expect(screen.getByText("Нет операций под выбранные фильтры.")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/money/ledger");
  });

  it("opens the finance audit trail from the money overview", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(auditLogResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Финансовый журнал" }));

    expect(await screen.findByRole("heading", { name: "Финансовый журнал" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/money/audit");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/audit?limit=50&scope=finance",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });

  it("opens receivable orders from the finance overview", async () => {
    const receivableOrder = {
      ...repairOrdersResponse.items[0],
      id: "repair-2",
      orderNumber: "00002",
      customerName: "Анна",
      instrumentName: "Fender Telecaster",
      paymentStatus: "PARTIALLY_PAID" as const,
      totalAmountCents: 300_000,
      paidAmountCents: 80_000,
      balanceDueCents: 220_000
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(receivableOrder))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse(serviceCatalogResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    await screen.findByText("Актуально");
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть дебиторку" }));

    expect(await screen.findByRole("heading", { name: "Дебиторка" })).toBeInTheDocument();
    expect(await screen.findByText("Fender Telecaster")).toBeInTheDocument();
    expect(screen.getByText("Анна")).toBeInTheDocument();
    expect(screen.getByText("№ 00002")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Открыть заказ № 00002" }));

    expect(window.location.pathname).toBe("/orders/repair-2");
    expect(await screen.findByRole("heading", { name: "№ 00002" })).toBeInTheDocument();
  });

  it("creates general expenses from the register and order item expenses from the order card", async () => {
    window.history.replaceState(null, "", "/");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(authResponse))
      .mockResolvedValueOnce(jsonResponse(dashboardResponse))
      .mockResolvedValueOnce(jsonResponse(financeOverviewResponse))
      .mockResolvedValueOnce(jsonResponse(expensesResponse))
      .mockResolvedValueOnce(jsonResponse(expenseCategoriesResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse({ id: "expense-1" }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse(expensesResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse.items[0]))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse(serviceCatalogResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse))
      .mockResolvedValueOnce(jsonResponse(expenseCategoriesResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse.items[0]))
      .mockResolvedValueOnce(jsonResponse({ id: "expense-2" }, { status: 201 }))
      .mockResolvedValueOnce(jsonResponse(repairOrdersResponse.items[0]))
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(jsonResponse(serviceCatalogResponse))
      .mockResolvedValueOnce(jsonResponse(repairOrderAuditResponse));

    render(<App />);

    await screen.findByLabelText("Заказы");
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/analytics/dashboard?month=2026-06",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
    fireEvent.click(screen.getByLabelText("Деньги"));
    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Расходы" }));
    await screen.findByRole("heading", { name: "Расходы" });
    fireEvent.click(screen.getByRole("button", { name: "Новый расход" }));
    expect(window.location.pathname).toBe("/money/expenses/new");
    expect(screen.getByLabelText("Деньги")).toHaveAttribute("aria-current", "page");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Добавить расход" })).not.toBeDisabled();
    });

    fireEvent.click(await screen.findByRole("checkbox", { name: /Общий расход/ }));
    fireEvent.change(await screen.findByLabelText("Описание"), {
      target: {
        value: "Аренда"
      }
    });
    fireEvent.change(screen.getByLabelText("Сумма, ₽"), {
      target: {
        value: "1000"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить расход" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/expenses",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            description: "Аренда",
            categoryId: "expense-category-1",
            paymentMethodId: "payment-method-1",
            amountCents: 100000,
            repairOrderId: undefined,
            repairOrderItemId: undefined
          })
        })
      );
    });
    expect(await screen.findByRole("heading", { name: "Расходы" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/money/expenses");

    fireEvent.click(await screen.findByLabelText("Заказы"));
    await screen.findByText("Fender Stratocaster");
    fireEvent.click(screen.getByRole("button", { name: /Fender Stratocaster.*№ 00001/ }));
    expect(await screen.findByRole("heading", { name: "№ 00001" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Добавить расход к позиции Отстройка"));
    expect(await screen.findByRole("heading", { name: "Расход по заказу" })).toBeInTheDocument();

    fireEvent.change(await screen.findByLabelText("Описание"), {
      target: {
        value: "Материал для услуги"
      }
    });
    fireEvent.change(screen.getByLabelText("Сумма, ₽"), {
      target: {
        value: "500"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить расход" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/expenses",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            description: "Материал для услуги",
            categoryId: "expense-category-1",
            paymentMethodId: "payment-method-1",
            amountCents: 50000,
            repairOrderId: "repair-1",
            repairOrderItemId: "item-1"
          })
        })
      );
    });
  });
});
