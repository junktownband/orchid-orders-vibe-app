import type { FastifyInstance, FastifyReply } from "fastify";

import { createFinanceOperationSchema, financeQuerySchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { addFinanceOperation, getFinanceOverview } from "./service.js";

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

export async function financeRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const query = financeQuerySchema.parse(request.query);

      return getFinanceOverview(auth, query);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/operations", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = createFinanceOperationSchema.parse(request.body);
      const operation = await addFinanceOperation(auth, input);

      return reply.status(201).send(operation);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
