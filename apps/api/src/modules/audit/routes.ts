import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { auditActionSchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { getAuditLogs } from "./service.js";

const auditQuerySchema = z.object({
  scope: z.enum(["finance"]).optional(),
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  action: auditActionSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
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

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const query = auditQuerySchema.parse(request.query);

      return getAuditLogs(auth, query);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
