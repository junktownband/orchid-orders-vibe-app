import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";

import { apiErrorCodes } from "@orchid/shared";

import { analyticsRoutes } from "./modules/analytics/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { commissionRoutes } from "./modules/commissions/routes.js";
import { customerRoutes } from "./modules/customers/routes.js";
import { expenseRoutes } from "./modules/expenses/routes.js";
import { financeRoutes } from "./modules/finance/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { repairOrderRoutes } from "./modules/repair-orders/routes.js";
import { serviceCatalogRoutes } from "./modules/service-catalog/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";

const defaultAppUrl = "http://localhost:5173";
const localDevOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

function allowedCorsOrigins() {
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    throw new Error("APP_URL must be set in production.");
  }

  const configuredAppUrl = process.env.APP_URL ?? defaultAppUrl;

  if (process.env.NODE_ENV === "development") {
    return [...new Set([configuredAppUrl, ...localDevOrigins])];
  }

  return configuredAppUrl;
}

function zodFieldErrors(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
}

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  app.register(cors, {
    origin: allowedCorsOrigins(),
    credentials: true
  });
  app.register(cookie);
  app.register(sensible);
  app.register(healthRoutes);
  app.register(authRoutes, {
    prefix: "/api/v1/auth"
  });
  app.register(repairOrderRoutes, {
    prefix: "/api/v1/repair-orders"
  });
  app.register(serviceCatalogRoutes, {
    prefix: "/api/v1/service-catalog"
  });
  app.register(settingsRoutes, {
    prefix: "/api/v1/settings"
  });
  app.register(customerRoutes, {
    prefix: "/api/v1/customers"
  });
  app.register(expenseRoutes, {
    prefix: "/api/v1/expenses"
  });
  app.register(commissionRoutes, {
    prefix: "/api/v1/commissions"
  });
  app.register(analyticsRoutes, {
    prefix: "/api/v1/analytics"
  });
  app.register(financeRoutes, {
    prefix: "/api/v1/finance"
  });
  app.register(auditRoutes, {
    prefix: "/api/v1/audit"
  });

  app.setErrorHandler((error: FastifyError | ZodError, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: apiErrorCodes.validation,
          message: "Validation failed",
          details: error.issues,
          errors: zodFieldErrors(error)
        }
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    const codeByStatus = {
      401: apiErrorCodes.unauthorized,
      403: apiErrorCodes.forbidden,
      404: apiErrorCodes.notFound,
      409: apiErrorCodes.conflict
    } as const;

    reply.status(statusCode).send({
      error: {
        code: codeByStatus[statusCode as keyof typeof codeByStatus] ?? apiErrorCodes.internal,
        message: statusCode === 500 ? "Internal server error" : error.message,
        details: [],
        errors: []
      }
    });
  });

  return app;
}
