import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExpensesListPage } from "./ExpensesPages";
import { expensesResponse, jsonResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("ExpensesListPage", () => {
  it("keeps business expenses separate from master commission payouts", async () => {
    window.history.replaceState(null, "", "/money/expenses?month=2026-06");
    const mixedExpensesResponse = {
      authors: [],
      items: [
        {
          amountCents: 45000,
          categoryColor: null,
          categoryId: "category-1",
          categoryName: "Материалы",
          createdAt: "2026-06-05T10:00:00.000Z",
          createdByName: "Саша",
          createdByUserId: "user-1",
          description: "Покупка струн",
          id: "expense-regular",
          kind: "REGULAR",
          paymentMethodId: "payment-method-1",
          paymentMethodName: "Наличные",
          repairOrderId: null,
          repairOrderItemId: null,
          repairOrderItemName: null,
          repairOrderNumber: null,
          spentAt: "2026-06-05T10:00:00.000Z",
          spentByName: null,
          status: "CONFIRMED",
          updatedAt: "2026-06-05T10:00:00.000Z",
          voidReason: null,
          voidedAt: null
        },
        {
          amountCents: 80000,
          categoryColor: null,
          categoryId: null,
          categoryName: null,
          createdAt: "2026-06-07T10:00:00.000Z",
          createdByName: "Саша",
          createdByUserId: "user-1",
          description: "Выплата Диме",
          id: "expense-salary",
          kind: "SALARY",
          paymentMethodId: "payment-method-2",
          paymentMethodName: "Перевод",
          repairOrderId: "repair-1",
          repairOrderItemId: "item-1",
          repairOrderItemName: "Настройка",
          repairOrderNumber: "00001",
          spentAt: "2026-06-07T10:00:00.000Z",
          spentByName: null,
          status: "CONFIRMED",
          updatedAt: "2026-06-07T10:00:00.000Z",
          voidReason: null,
          voidedAt: null
        }
      ]
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(mixedExpensesResponse));

    render(<ExpensesListPage accessToken="access-token" navigate={vi.fn()} />);

    expect(await screen.findAllByText("Покупка струн")).not.toHaveLength(0);
    expect(screen.queryByText("Выплата Диме")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Комиссии мастерам/ }));

    expect(screen.queryByText("Покупка струн")).not.toBeInTheDocument();
    expect(screen.getAllByText("Выплата Диме")).not.toHaveLength(0);
    expect(window.location.search).toContain("scope=commissions");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Все" }));

    expect(screen.getAllByText("Покупка струн")).not.toHaveLength(0);
    expect(screen.getAllByText("Выплата Диме")).not.toHaveLength(0);
  });

  it("uses the selected money month as the expense date range", async () => {
    window.history.replaceState(null, "", "/money/expenses?month=2026-06");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(expensesResponse));

    render(<ExpensesListPage accessToken="access-token" navigate={vi.fn()} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/expenses?from=2026-06-01&to=2026-06-30&limit=160",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });

  it("keeps expenses in the selected money month when paging months", async () => {
    window.history.replaceState(null, "", "/money/expenses?month=2026-06");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(expensesResponse))
      .mockResolvedValueOnce(jsonResponse(expensesResponse));

    render(<ExpensesListPage accessToken="access-token" navigate={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /Июнь 2026/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Следующий месяц"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/expenses?from=2026-07-01&to=2026-07-31&limit=160",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });

    expect(window.location.search).toContain("month=2026-07");
  });

  it("returns to the selected money month from the expense register", async () => {
    window.history.replaceState(null, "", "/money/expenses?month=2026-06");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(expensesResponse));
    const navigate = vi.fn();

    render(<ExpensesListPage accessToken="access-token" navigate={navigate} />);

    fireEvent.click(await screen.findByLabelText("Назад"));

    expect(navigate).toHaveBeenCalledWith({
      section: "money",
      view: "overview",
      month: "2026-06"
    });
  });
});
