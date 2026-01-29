import { FastifyInstance } from 'fastify';
import { indexRouteSchema } from '../docs/routes/index.js';

/**
 * Rota raiz - Boas-vindas
 */
export async function indexRoutes(fastify: FastifyInstance) {
  fastify.get('/', { schema: indexRouteSchema }, async (request, reply) => {
    return {
      message: 'Bem-vindo ao Assistente de IA',
      status: 'online',
    };
  });
}
