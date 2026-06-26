import { cleanup, render, screen } from "@testing-library/react";
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

    render(<MoneyPage accessToken="access-token" navigate={vi.fn()} />);

    expect(await screen.findByText("Финансовая позиция")).toBeInTheDocument();
    expect(screen.getByText("Расходы бизнеса")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Выплаты мастерам" })).toBeInTheDocument();
    expect(screen.getAllByText("Выплачено").length).toBeGreaterThan(0);
    expect(screen.getAllByText("К выплате").length).toBeGreaterThan(0);
  });
});
