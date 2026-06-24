import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { markMasterCommissionsPaidSchema, masterCommissionQuerySchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { getMasterCommissions, setMasterCommissionPaid, setMasterCommissionsPaid } from "./service.js";

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

export async function commissionRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const query = masterCommissionQuerySchema.parse(request.query);

      return getMasterCommissions(auth, query);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/bulk-mark-paid", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = markMasterCommissionsPaidSchema.parse(request.body);

      return setMasterCommissionsPaid(auth, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/:id/mark-paid", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);

      return setMasterCommissionPaid(auth, params.id);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
