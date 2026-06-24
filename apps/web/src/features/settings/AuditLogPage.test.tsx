import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditLogPage } from "./AuditLogPage";
import { auditLogResponse, jsonResponse } from "../../test/fixtures";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("AuditLogPage", () => {
  it("loads audit filters from the URL and sends them to the API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(auditLogResponse));

    window.history.replaceState(null, "", "/settings/audit?entityType=RepairOrder&action=ISSUE");

    render(<AuditLogPage accessToken="access-token" navigate={vi.fn()} />);

    expect(await screen.findByLabelText("Сущность")).toHaveValue("RepairOrder");
    expect(screen.getByLabelText("Действие")).toHaveValue("ISSUE");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/audit?limit=50&entityType=RepairOrder&action=ISSUE",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });
});
