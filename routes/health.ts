import { FastifyInstance } from 'fastify';
import { healthRouteSchema } from '../docs/routes/health.js';

/**
 * Rota de health check
 */
export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', { schema: healthRouteSchema }, async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });
}
