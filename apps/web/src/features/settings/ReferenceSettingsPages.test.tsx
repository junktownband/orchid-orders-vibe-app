import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReferenceSettingsPage } from "./ReferenceSettingsPages";
import { jsonResponse, paymentMethodsResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReferenceSettingsPage", () => {
  it("requires confirmation before deactivating a payment method", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(paymentMethodsResponse))
      .mockResolvedValueOnce(
        jsonResponse({
          ...paymentMethodsResponse.items[0],
          isActive: false
        })
      );

    render(<ReferenceSettingsPage accessToken="access-token" kind="payment-methods" navigate={vi.fn()} />);

    const activeToggles = await screen.findAllByLabelText("Активен");
    fireEvent.click(activeToggles[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Сохранить" })[0]);

    expect(screen.getByRole("heading", { name: "Отключить способ оплаты?" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Отключить способ оплаты" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/settings/payment-methods/payment-method-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Наличные",
            color: undefined,
            isActive: false,
            sortOrder: 10
          })
        })
      );
    });
  });
});
