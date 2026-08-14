import { FastifyInstance, FastifyReply } from "fastify";
import { AIService } from "../services/ai-service.js";
import {
  ReleaseNotesService,
  NENHUM_ITEM_ENCONTRADO_ERROR,
} from "../services/release-notes-service.js";
import type {
  ReleaseNotesDeltaEvent,
  ReleaseNotesProgressEvent,
  ReleaseNotesRequest,
  ReleaseNotesResponse,
} from "../types/release-notes.js";
import {
  releaseNotesRouteSchema,
  releaseNotesStreamRouteSchema,
} from "../docs/routes/release-notes.js";
import { getCorsOrigins } from "../cors-origins.js";

function writeSse(
  reply: FastifyReply,
  event: string,
  data: unknown,
): void {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

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

  /**
   * Mesmo fluxo do GET acima, mas emite progresso real via Server-Sent Events
   * enquanto processa. Eventos: `progress`, `delta`, `done`, `fail`.
   */
  fastify.get<{
    Params: { liberacaoId: string };
    Querystring: { promptId?: string };
  }>(
    "/api/release-notes/:liberacaoId/stream",
    {
      schema: {
        tags: releaseNotesStreamRouteSchema.tags,
        summary: releaseNotesStreamRouteSchema.summary,
        description: releaseNotesStreamRouteSchema.description,
        params: releaseNotesStreamRouteSchema.params,
        querystring: releaseNotesStreamRouteSchema.querystring,
        // SSE: resposta não é JSON único — schema de response omitido de propósito
      },
    },
    async (request, reply) => {
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

      reply.hijack();
      const requestOrigin = request.headers.origin;
      const allowedOrigins = getCorsOrigins();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...(requestOrigin && allowedOrigins.includes(requestOrigin)
          ? { "Access-Control-Allow-Origin": requestOrigin }
          : {}),
      });

      const abortController = new AbortController();
      let closed = false;
      const onClose = () => {
        closed = true;
        abortController.abort();
      };
      request.raw.on("close", onClose);

      const send = (event: string, data: unknown) => {
        if (closed) return;
        writeSse(reply, event, data);
      };

      try {
        const service = new ReleaseNotesService(aiService);
        const result: ReleaseNotesResponse = await service.analyze(
          { liberacaoId, promptId },
          {
            onProgress: (progress: ReleaseNotesProgressEvent) => {
              send("progress", progress);
            },
            onDelta: (delta: ReleaseNotesDeltaEvent) => {
              send("delta", delta);
            },
            signal: abortController.signal,
          },
        );

        // Cliente já saiu: não emite fail/done (evita write após close)
        if (closed) return;

        if (!result.success) {
          send("fail", {
            success: false,
            error: result.error,
            processedIn: result.processedIn,
          });
        } else {
          send("done", result);
        }
      } catch (error: any) {
        fastify.log.error(error, "Erro no stream do Registro de Liberação");
        send("fail", {
          success: false,
          error: error.message || "Erro interno do servidor",
        });
      } finally {
        request.raw.off("close", onClose);
        if (!closed) {
          reply.raw.end();
        }
      }
    },
  );
}
