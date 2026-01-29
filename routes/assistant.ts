import { FastifyInstance } from 'fastify';
import { AIService } from '../services/ai-service.js';
import { AssistantRequest } from '../types/assistant.js';
import { assistantRouteSchema } from '../docs/routes/assistant.js';
import { assistantRequestSchema } from '../docs/schemas/assistant.js';

/**
 * Rota principal do assistente de IA
 */
export async function assistantRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: AssistantRequest }>(
    '/api/assistant',
    {
      schema: {
        tags: assistantRouteSchema.tags,
        summary: assistantRouteSchema.summary,
        description: assistantRouteSchema.description,
        body: assistantRequestSchema, // Schema de validação (sem example)
        response: assistantRouteSchema.response, // Schema de documentação (com example)
      },
    },
    async (request, reply) => {
      try {
        // Verificar se o serviço está disponível
        const aiService = (fastify as any).aiService as AIService | undefined;

        if (!aiService) {
          return reply.code(503).send({
            success: false,
            error: 'Serviço de IA não está disponível. Verifique a configuração da GEMINI_API_KEY.',
          });
        }

        const { description } = request.body;

        if (!description || description.trim().length === 0) {
          return reply.code(400).send({
            success: false,
            error: 'A descrição é obrigatória',
          });
        }

        const result = await aiService.processReport({ description });

        if (!result.success) {
          return reply.code(400).send(result);
        }

        return reply.code(200).send(result);
      } catch (error: any) {
        fastify.log.error(error, 'Erro ao processar relatório');
        return reply.code(500).send({
          success: false,
          error: error.message || 'Erro interno do servidor',
        });
      }
    }
  );
}
