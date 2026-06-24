import { describe, expect, it } from "vitest";

import { buildApp } from "../../app.js";

describe("customer routes", () => {
  it("rejects customer update requests without access token", async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/customers/customer-1",
      payload: {
        name: "Иван"
      }
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
