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
