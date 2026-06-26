import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoneyPayoutsPage } from "./MoneyPayoutsPage";
import { authResponse, commissionsResponse, jsonResponse, mastersResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("MoneyPayoutsPage", () => {
  it("loads payout filters for the last 60 days by default", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
    window.history.replaceState(null, "", "/analytics");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));

    render(<MoneyPayoutsPage accessToken="access-token" user={authResponse.user} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/commissions?payoutStatus=UNPAID&from=2026-04-27&to=2026-06-25",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });

  it("uses the selected money month as the payout date range", async () => {
    window.history.replaceState(null, "", "/money/payouts?month=2026-06");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));

    render(<MoneyPayoutsPage accessToken="access-token" user={authResponse.user} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/commissions?payoutStatus=UNPAID&from=2026-06-01&to=2026-06-30",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });

  it("keeps payouts in the selected money month when paging months", async () => {
    window.history.replaceState(null, "", "/money/payouts?month=2026-06");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));

    render(<MoneyPayoutsPage accessToken="access-token" user={authResponse.user} />);

    expect(await screen.findByRole("button", { name: /Июнь 2026/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Следующий месяц"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/commissions?payoutStatus=UNPAID&from=2026-07-01&to=2026-07-31",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });

    expect(window.location.search).toContain("month=2026-07");
  });
});
