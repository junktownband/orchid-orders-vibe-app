import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import {
  assignRepairOrderMasterSchema,
  addRepairOrderPaymentSchema,
  createRepairOrderSchema,
  issueRepairOrderSchema,
  repairOrdersQuerySchema,
  updateRepairOrderItemsSchema,
  updateRepairOrderStatusSchema,
  voidRepairOrderPaymentSchema
} from "@orchid/shared";

import { authenticate, AuthError } from "../auth/service.js";
import {
  addRepairOrder,
  getMasters,
  getRepairOrderAudit,
  getRepairOrderById,
  getRepairOrders,
  setRepairOrderItems,
  setRepairOrderIssued,
  setRepairOrderMaster,
  setRepairOrderPaid,
  setRepairOrderPaymentVoided,
  setRepairOrderStatus
} from "./service.js";

const paramsSchema = z.object({
  id: z.string().min(1)
});

const paymentParamsSchema = z.object({
  id: z.string().min(1),
  paymentId: z.string().min(1)
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

export async function repairOrderRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const query = repairOrdersQuerySchema.parse(request.query);

      return getRepairOrders(auth, query);
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
      const input = createRepairOrderSchema.parse(request.body);
      const order = await addRepairOrder(auth, input);

      return reply.status(201).send(order);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/masters", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      return getMasters(auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);

      return getRepairOrderById(auth, params.id);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.get("/:id/audit", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);

      return getRepairOrderAudit(auth, params.id);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/:id/assignee", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = assignRepairOrderMasterSchema.parse(request.body);

      return setRepairOrderMaster(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.put("/:id/items", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateRepairOrderItemsSchema.parse(request.body);

      return setRepairOrderItems(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.patch("/:id/status", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = updateRepairOrderStatusSchema.parse(request.body);

      return setRepairOrderStatus(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/:id/issue", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paramsSchema.parse(request.params);
      const input = issueRepairOrderSchema.parse(request.body);

      return setRepairOrderIssued(auth, params.id, input);
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
      const input = addRepairOrderPaymentSchema.parse(request.body);

      return setRepairOrderPaid(auth, params.id, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });

  app.post("/:id/payments/:paymentId/void", async (request, reply) => {
    try {
      const auth = await authenticate(request.headers.authorization);
      const params = paymentParamsSchema.parse(request.params);
      const input = voidRepairOrderPaymentSchema.parse(request.body);

      return setRepairOrderPaymentVoided(auth, params.id, params.paymentId, input);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(reply, error);
      }

      throw error;
    }
  });
}
