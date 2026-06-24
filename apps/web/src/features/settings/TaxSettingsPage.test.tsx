import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaxSettingsPage } from "./TaxSettingsPage";
import { authResponse, jsonResponse } from "../../test/fixtures";

const settingsResponse = {
  id: "settings-1",
  taxMode: "NONE",
  selfEmployedIndividualRateBps: 400,
  selfEmployedBusinessRateBps: 600,
  updatedAt: "2026-06-17T10:00:00.000Z"
} as const;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TaxSettingsPage", () => {
  it("requires confirmation before changing the tax mode", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(settingsResponse))
      .mockResolvedValueOnce(
        jsonResponse({
          ...settingsResponse,
          taxMode: "SELF_EMPLOYED"
        })
      );

    render(<TaxSettingsPage accessToken="access-token" navigate={vi.fn()} user={authResponse.user} />);

    fireEvent.click(await screen.findByRole("radio", { name: /Самозанятость/ }));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(screen.getByRole("heading", { name: "Изменить налоговый режим?" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Изменить режим" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/settings/tax",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            taxMode: "SELF_EMPLOYED"
          })
        })
      );
    });
  });
});
