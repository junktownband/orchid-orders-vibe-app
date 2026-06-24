import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { createServiceCatalogItemSchema, updateServiceCatalogItemSchema } from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import { addServiceCatalogItem, editServiceCatalogItem, getServiceCatalog } from "./service.js";

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

export async function serviceCatalogRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getServiceCatalog(auth);
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
      const input = createServiceCatalogItemSchema.parse(request.body);
      const item = await addServiceCatalogItem(auth, input);

      return reply.status(201).send(item);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateServiceCatalogItemSchema.parse(request.body);

      return editServiceCatalogItem(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
