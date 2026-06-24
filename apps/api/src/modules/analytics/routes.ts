import type { FastifyInstance, FastifyReply } from "fastify";

import { authenticate, AuthError } from "../auth/service.js";
import { getDashboard } from "./service.js";

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

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getDashboard(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
