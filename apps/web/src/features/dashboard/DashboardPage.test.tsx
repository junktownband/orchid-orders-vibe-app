import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./DashboardPage";
import { dashboardResponse, jsonResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("shows one order status overview and keeps quick actions available", async () => {
    window.history.replaceState(null, "", "/?month=2026-06");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(dashboardResponse));

    render(<DashboardPage accessToken="access-token" navigate={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "Состояние заказов" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Главная за/i })).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Статусы")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новый заказ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Заказы" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Новый расход" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Услуги" })).toBeInTheDocument();
  });
});
