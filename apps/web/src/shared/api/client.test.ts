import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json"
    },
    status: 200
  });
}

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not send a JSON content type when the request has no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest<{ ok: boolean }>("/api/v1/auth/refresh", {
      method: "POST"
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("sends a JSON content type when the request has a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest<{ ok: boolean }>("/api/v1/auth/login", {
      body: JSON.stringify({ email: "sasha@orchid.local", password: "orchid12345" }),
      method: "POST"
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(init.headers).toHaveProperty("Content-Type", "application/json");
  });
});
