import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";
import { monthPeriod } from "./service.js";

describe("analytics routes", () => {
  it("uses organization timezone for month period boundaries", () => {
    const period = monthPeriod(new Date("2026-06-15T12:00:00.000Z"), "Asia/Yekaterinburg");

    expect(period.from.toISOString()).toBe("2026-05-31T19:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-06-30T18:59:59.999Z");
  });

  it("keeps UTC boundaries for UTC organizations", () => {
    const period = monthPeriod(new Date("2026-06-15T12:00:00.000Z"), "UTC");

    expect(period.from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-06-30T23:59:59.999Z");
  });

  it("rejects dashboard requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics/dashboard"
    });

    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing access token",
        details: [],
        errors: []
      }
    });
  });
});
