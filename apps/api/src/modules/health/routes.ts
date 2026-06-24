import type { FastifyInstance } from "fastify";

const healthResponse = {
  status: "ok",
  service: "orchid-control-api"
} as const;

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => healthResponse);
  app.get("/api/v1/health", async () => healthResponse);
}
