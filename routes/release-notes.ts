import { FastifyInstance } from "fastify";
import { AIService } from "../services/ai-service.js";
import {
  ReleaseNotesService,
  NENHUM_ITEM_ENCONTRADO_ERROR,
} from "../services/release-notes-service.js";
import { ReleaseNotesRequest } from "../types/release-notes.js";
import { releaseNotesRouteSchema } from "../docs/routes/release-notes.js";

/**
 * Rota de geração do Registro de Liberação via IA a partir de um registro de
 * liberação (liberacaoId) da API SoftFlow.
 */
export async function releaseNotesRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { liberacaoId: string };
    Querystring: { promptId?: string };
  }>(
    "/api/release-notes/:liberacaoId",
    {
      schema: {
        tags: releaseNotesRouteSchema.tags,
        summary: releaseNotesRouteSchema.summary,
        description: releaseNotesRouteSchema.description,
        params: releaseNotesRouteSchema.params,
        querystring: releaseNotesRouteSchema.querystring,
        response: releaseNotesRouteSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const { liberacaoId } = request.params;
        const { promptId } = request.query;

        if (!liberacaoId?.trim()) {
          return reply.code(400).send({
            success: false,
            error: "O parâmetro 'liberacaoId' é obrigatório.",
          });
        }

        const aiService = (fastify as any).aiService as AIService | undefined;
        if (!aiService) {
          return reply.code(503).send({
            success: false,
            error:
              "Serviço de IA não está disponível. Verifique a configuração da OPENAI_API_KEY.",
          });
        }

        const analysisRequest: ReleaseNotesRequest = {
          liberacaoId,
          promptId,
        };

        const service = new ReleaseNotesService(aiService);
        const result = await service.analyze(analysisRequest);

        if (!result.success) {
          const isNotFound =
            result.error === NENHUM_ITEM_ENCONTRADO_ERROR ||
            result.error?.includes("não encontrado para o tipo");

          return reply.code(isNotFound ? 404 : 500).send(result);
        }

        return reply.code(200).send(result);
      } catch (error: any) {
        fastify.log.error(error, "Erro ao gerar Registro de Liberação");
        return reply.code(500).send({
          success: false,
          error: error.message || "Erro interno do servidor",
        });
      }
    },
  );
}
