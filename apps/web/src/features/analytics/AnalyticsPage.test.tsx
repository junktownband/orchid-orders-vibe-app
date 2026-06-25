import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsPage } from "./AnalyticsPage";
import { authResponse, commissionsResponse, jsonResponse, mastersResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("AnalyticsPage", () => {
  it("loads payout filters for the last 60 days by default", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
    window.history.replaceState(null, "", "/analytics");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mastersResponse))
      .mockResolvedValueOnce(jsonResponse(commissionsResponse));

    render(<AnalyticsPage accessToken="access-token" user={authResponse.user} />);

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
});
