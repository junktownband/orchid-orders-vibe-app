import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

describe("settings routes", () => {
  it("rejects member management requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/settings/members"
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

  it("rejects payment reference requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/settings/payment-methods"
    });

    await app.close();

    expect(response.statusCode).toBe(401);
  });
});
