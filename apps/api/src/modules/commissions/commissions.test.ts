import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

describe("commission routes", () => {
  it("rejects commission register requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/commissions"
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
