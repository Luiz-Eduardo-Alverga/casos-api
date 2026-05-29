import { FastifyInstance } from "fastify";
import { AIService } from "../services/ai-service.js";
import { ProductionAnalysisService } from "../services/production-analysis-service.js";
import {
  ProductionAnalysisRequest,
  ProductionConfig,
} from "../types/production-analysis.js";
import {
  productionAnalysisRouteSchema,
  singleColaboradorRouteSchema,
} from "../docs/routes/production-analysis.js";

/**
 * Rota de auditoria de produção diária dos colaboradores do squad.
 * Consulta a API SoftFlow, pré-processa e analisa via Gemini.
 */
export async function productionAnalysisRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: Record<string, string> }>(
    "/api/production-analysis",
    {
      schema: {
        tags: productionAnalysisRouteSchema.tags,
        summary: productionAnalysisRouteSchema.summary,
        description: productionAnalysisRouteSchema.description,
        querystring: productionAnalysisRouteSchema.querystring,
        response: productionAnalysisRouteSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const q = request.query;

        // Validação: datas obrigatórias
        if (!q.data_producao_inicio || !q.data_producao_fim) {
          return reply.code(400).send({
            success: false,
            error:
              "Os parâmetros data_producao_inicio e data_producao_fim são obrigatórios.",
          });
        }

        // Validação: ao menos projeto_id ou usuario
        if (!q.projeto_id && !q.usuario) {
          return reply.code(400).send({
            success: false,
            error:
              "É necessário informar ao menos um entre projeto_id e usuario.",
          });
        }

        // Verificar se o serviço de IA está disponível
        const aiService = (fastify as any).aiService as AIService | undefined;
        if (!aiService) {
          return reply.code(503).send({
            success: false,
            error:
              "Serviço de IA não está disponível. Verifique a configuração da GEMINI_API_KEY.",
          });
        }

        // Montar configuração parcial a partir dos query params
        const configParcial: Partial<ProductionConfig> = {};
        if (q.meta_minutos) configParcial.meta_minutos = Number(q.meta_minutos);
        if (q.tolerancia_meta_minutos)
          configParcial.tolerancia_meta_minutos = Number(
            q.tolerancia_meta_minutos,
          );
        if (q.janela_inicio) configParcial.janela_inicio = q.janela_inicio;
        if (q.janela_fim) configParcial.janela_fim = q.janela_fim;
        if (q.limite_almoco_minutos)
          configParcial.limite_almoco_minutos = Number(q.limite_almoco_minutos);
        if (q.tolerancia_almoco_minutos)
          configParcial.tolerancia_almoco_minutos = Number(
            q.tolerancia_almoco_minutos,
          );
        if (q.limite_apagao_minutos)
          configParcial.limite_apagao_minutos = Number(q.limite_apagao_minutos);
        if (q.limite_producao_virada_minutos)
          configParcial.limite_producao_virada_minutos = Number(
            q.limite_producao_virada_minutos,
          );

        const analysisRequest: ProductionAnalysisRequest = {
          data_producao_inicio: q.data_producao_inicio,
          data_producao_fim: q.data_producao_fim,
          projeto_id: q.projeto_id,
          usuario: q.usuario,
          configuracao:
            Object.keys(configParcial).length > 0 ? configParcial : undefined,
        };

        const service = new ProductionAnalysisService(aiService.getModel());
        const result = await service.analyze(analysisRequest);

        if (!result.success) {
          return reply.code(500).send(result);
        }

        return reply.code(200).send(result);
      } catch (error: any) {
        fastify.log.error(error, "Erro ao processar análise de produção");
        return reply.code(500).send({
          success: false,
          error: error.message || "Erro interno do servidor",
        });
      }
    },
  );

  fastify.get<{
    Params: { userId: string };
    Querystring: Record<string, string>;
  }>(
    "/api/production-analysis/:userId",
    {
      schema: {
        tags: singleColaboradorRouteSchema.tags,
        summary: singleColaboradorRouteSchema.summary,
        description: singleColaboradorRouteSchema.description,
        params: singleColaboradorRouteSchema.params,
        querystring: singleColaboradorRouteSchema.querystring,
        response: singleColaboradorRouteSchema.response,
      },
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const q = request.query;

        if (!q.data_producao_inicio || !q.data_producao_fim) {
          return reply.code(400).send({
            success: false,
            error:
              "Os parâmetros data_producao_inicio e data_producao_fim são obrigatórios.",
          });
        }

        const aiService = (fastify as any).aiService as AIService | undefined;
        if (!aiService) {
          return reply.code(503).send({
            success: false,
            error:
              "Serviço de IA não está disponível. Verifique a configuração da GEMINI_API_KEY.",
          });
        }

        const configParcial: Partial<ProductionConfig> = {};
        if (q.meta_minutos) configParcial.meta_minutos = Number(q.meta_minutos);
        if (q.tolerancia_meta_minutos)
          configParcial.tolerancia_meta_minutos = Number(
            q.tolerancia_meta_minutos,
          );
        if (q.janela_inicio) configParcial.janela_inicio = q.janela_inicio;
        if (q.janela_fim) configParcial.janela_fim = q.janela_fim;
        if (q.limite_almoco_minutos)
          configParcial.limite_almoco_minutos = Number(q.limite_almoco_minutos);
        if (q.tolerancia_almoco_minutos)
          configParcial.tolerancia_almoco_minutos = Number(
            q.tolerancia_almoco_minutos,
          );
        if (q.limite_apagao_minutos)
          configParcial.limite_apagao_minutos = Number(q.limite_apagao_minutos);
        if (q.limite_producao_virada_minutos)
          configParcial.limite_producao_virada_minutos = Number(
            q.limite_producao_virada_minutos,
          );

        const analysisRequest: ProductionAnalysisRequest = {
          data_producao_inicio: q.data_producao_inicio,
          data_producao_fim: q.data_producao_fim,
          usuario: userId,
          configuracao:
            Object.keys(configParcial).length > 0 ? configParcial : undefined,
        };

        const service = new ProductionAnalysisService(aiService.getModel());
        const result = await service.analyze(analysisRequest);

        if (!result.success) {
          return reply.code(500).send(result);
        }

        const colaborador = result.data?.colaboradores?.[0];
        if (!colaborador) {
          return reply.code(404).send({
            success: false,
            error:
              "Nenhum registro de produção encontrado para este colaborador no período informado.",
          });
        }

        return reply.code(200).send({
          success: true,
          data: colaborador,
          processedIn: result.processedIn,
        });
      } catch (error: any) {
        fastify.log.error(
          error,
          "Erro ao processar análise de produção do colaborador",
        );
        return reply.code(500).send({
          success: false,
          error: error.message || "Erro interno do servidor",
        });
      }
    },
  );
}
