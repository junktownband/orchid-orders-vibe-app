import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const authUser = {
  id: "user-1",
  email: "owner@example.test",
  name: "Owner",
  role: "OWNER",
  organization: {
    id: "org-1",
    name: "Orchid Workshop",
    currency: "RUB",
    timezone: "Asia/Yekaterinburg"
  }
};

vi.mock("./service.js", () => ({
  AuthError: class AuthError extends Error {
    public readonly errors = [];

    constructor(
      public readonly code: string,
      message: string,
      public readonly statusCode: number
    ) {
      super(message);
    }
  },
  login: vi.fn(async () => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: authUser
  })),
  me: vi.fn(),
  refresh: vi.fn()
}));

async function buildAuthRouteApp() {
  const { authRoutes } = await import("./routes.js");
  const app = Fastify();

  app.register(cookie);
  app.register(authRoutes, {
    prefix: "/api/v1/auth"
  });

  await app.ready();
  return app;
}

describe("auth cookie settings", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("marks refresh cookies as secure in production by default", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const app = await buildAuthRouteApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.test",
        password: "password123"
      }
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("Secure");
  });

  it("allows refresh cookies over HTTP when ORCHID_COOKIE_SECURE=false", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ORCHID_COOKIE_SECURE", "false");

    const app = await buildAuthRouteApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "owner@example.test",
        password: "password123"
      }
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).not.toContain("Secure");
  });
});
