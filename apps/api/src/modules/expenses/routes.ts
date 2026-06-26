import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { createExpenseSchema, expenseQuerySchema, voidExpenseSchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { addExpense, getExpenses, setExpenseConfirmed, setExpenseVoided } from "./service.js";

const paramsSchema = z.object({
  id: z.string().min(1)
});

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

export async function expenseRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const query = expenseQuerySchema.parse(request.query);

      return getExpenses(auth, query);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = createExpenseSchema.parse(request.body);
      const expense = await addExpense(auth, input);

      return reply.status(201).send(expense);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/:id/confirm", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);

      return setExpenseConfirmed(auth, params.id);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/:id/void", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = voidExpenseSchema.parse(request.body);

      return setExpenseVoided(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
