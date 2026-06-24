import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const app = buildApp();

describe("health route", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns service status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "orchid-control-api"
    });
  });

  it("also exposes versioned health endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "orchid-control-api"
    });
  });
});
