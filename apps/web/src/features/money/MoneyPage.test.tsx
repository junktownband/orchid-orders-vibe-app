import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoneyPage } from "./MoneyPage";
import { financeOverviewResponse, jsonResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("MoneyPage", () => {
  it("separates business expenses from master commission payouts", async () => {
    window.history.replaceState(null, "", "/money?month=2026-06");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(financeOverviewResponse));
    const navigate = vi.fn();

    render(<MoneyPage accessToken="access-token" navigate={navigate} />);

    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    expect(screen.getByText("Расходы бизнеса")).toBeInTheDocument();
    expect(screen.getByText("Без выплат мастерам")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Все исходящие" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Выплаты мастерам" })).toBeInTheDocument();
    expect(screen.getAllByText("Выплачено").length).toBeGreaterThan(0);
    expect(screen.getAllByText("К выплате").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Все" }));

    expect(navigate).toHaveBeenCalledWith({
      section: "money",
      view: "expenses",
      month: "2026-06",
      expenseScope: "all"
    });
  });
});
