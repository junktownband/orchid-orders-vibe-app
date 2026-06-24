import type { FastifyInstance, FastifyReply } from "fastify";

import { apiErrorCodes, loginRequestSchema } from "@orchid/shared";

import { AuthError, login, me, refresh } from "./service.js";

const refreshCookieName = "orchid_refresh";
const refreshCookiePath = "/api/v1/auth";

function isRefreshCookieSecure() {
  const configuredValue = process.env.ORCHID_COOKIE_SECURE?.toLowerCase();

  if (configuredValue === "false" || configuredValue === "0" || configuredValue === "no") {
    return false;
  }

  if (configuredValue === "true" || configuredValue === "1" || configuredValue === "yes") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

function sendAuthError(reply: FastifyReply, error: AuthError) {
  return reply.status(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
      details: [],
      errors: error.errors
    }
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    try {
      const result = await login(loginRequestSchema.parse(request.body));

      reply.setCookie(refreshCookieName, result.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isRefreshCookieSecure(),
        path: refreshCookiePath,
        maxAge: 60 * 60 * 24 * 30
      });

      return {
        accessToken: result.accessToken,
        user: result.user
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/refresh", async (request, reply) => {
    try {
      const result = await refresh(request.cookies[refreshCookieName]);

      reply.setCookie(refreshCookieName, result.refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: isRefreshCookieSecure(),
        path: refreshCookiePath,
        maxAge: 60 * 60 * 24 * 30
      });

      return {
        accessToken: result.accessToken,
        user: result.user
      };
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie(refreshCookieName, {
      path: refreshCookiePath
    });

    return {
      ok: true
    };
  });

  app.get("/me", async (request, reply) => {
    try {
      return await me(request.headers.authorization);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      return reply.status(401).send({
        error: {
          code: apiErrorCodes.unauthorized,
          message: "Unauthorized",
          details: [],
          errors: []
        }
      });
    }
  });
}
