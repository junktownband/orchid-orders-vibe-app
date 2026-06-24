import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

describe("auth routes", () => {
  it("rejects /me without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me"
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

  it("rejects /me with an invalid access token as unauthorized", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        Authorization: "Bearer invalid-token"
      }
    });

    await app.close();

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Session is no longer valid",
        details: [],
        errors: []
      }
    });
  });
});
