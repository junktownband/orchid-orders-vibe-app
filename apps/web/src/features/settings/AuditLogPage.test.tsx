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

  it("loads only finance audit events in money mode", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(auditLogResponse));

    window.history.replaceState(null, "", "/money/audit?entityType=Expense&action=CREATE");

    render(<AuditLogPage accessToken="access-token" mode="money" navigate={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: "История изменений" })).toBeInTheDocument();
    expect(screen.getByLabelText("Сущность")).toHaveValue("Expense");
    expect(screen.queryByRole("option", { name: "Клиенты" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/audit?limit=50&scope=finance&entityType=Expense&action=CREATE",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer access-token"
          })
        })
      );
    });
  });

  it("renders finance audit details as a human-readable log", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: "audit-expense-1",
            entityType: "Expense",
            entityId: "expense-1",
            action: "CONFIRM",
            userName: "Саша",
            beforeJson: null,
            afterJson: {
              amountCents: 168_000,
              repairOrderNumber: "00001",
              repairOrderItemName: "Настройка",
              status: "CONFIRMED"
            },
            comment: "Expense confirmed",
            createdAt: "2026-06-15T10:00:00.000Z"
          }
        ]
      })
    );

    render(<AuditLogPage accessToken="access-token" mode="money" navigate={vi.fn()} />);

    expect(await screen.findByText("Расход подтвержден")).toBeInTheDocument();
    expect(screen.getByText("Сумма")).toBeInTheDocument();
    expect(screen.getByText(/1\s?680/)).toBeInTheDocument();
    expect(screen.getByText("Заказ")).toBeInTheDocument();
    expect(screen.getByText("№ 00001")).toBeInTheDocument();
    expect(screen.queryByText(/amountCents/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Expense confirmed/)).not.toBeInTheDocument();
  });
});
