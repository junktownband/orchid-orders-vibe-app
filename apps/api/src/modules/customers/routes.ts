import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { updateCustomerSchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { editCustomer } from "./service.js";

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

export async function customerRoutes(app: FastifyInstance) {
  app.patch("/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateCustomerSchema.parse(request.body);

      return editCustomer(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
