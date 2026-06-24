import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import {
  createExpenseCategorySchema,
  createMemberSchema,
  createPaymentMethodSchema,
  updateExpenseCategorySchema,
  updateMemberSchema,
  updatePaymentMethodSchema,
  updateTaxSettingsSchema
} from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import {
  addExpenseCategory,
  addMember,
  addPaymentMethod,
  editExpenseCategory,
  editMember,
  editPaymentMethod,
  getExpenseCategories,
  getMembers,
  getOrganizationSettings,
  getPaymentMethods,
  removeMember,
  setTaxSettings
} from "./service.js";

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

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getOrganizationSettings(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/tax", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = updateTaxSettingsSchema.parse(request.body);

      return setTaxSettings(auth, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/payment-methods", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getPaymentMethods(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/payment-methods", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = createPaymentMethodSchema.parse(request.body);
      const method = await addPaymentMethod(auth, input);

      return reply.status(201).send(method);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/payment-methods/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updatePaymentMethodSchema.parse(request.body);

      return editPaymentMethod(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/expense-categories", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getExpenseCategories(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/expense-categories", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = createExpenseCategorySchema.parse(request.body);
      const category = await addExpenseCategory(auth, input);

      return reply.status(201).send(category);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/expense-categories/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateExpenseCategorySchema.parse(request.body);

      return editExpenseCategory(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/members", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getMembers(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/members", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const input = createMemberSchema.parse(request.body);
      const member = await addMember(auth, input);

      return reply.status(201).send(member);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/members/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateMemberSchema.parse(request.body);

      return editMember(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.delete("/members/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);

      return removeMember(auth, params.id);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
