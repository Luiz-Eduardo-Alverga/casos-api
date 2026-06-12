import { FastifyInstance } from "fastify";
import { AIService } from "../services/ai-service.js";
import { ReportAnalysisRequest } from "../types/assistant.js";
import { reportAnalysisRouteSchema } from "../docs/routes/report-analysis.js";

/**
 * Rota de análise de reports (PM/PO) para validação por desenvolvimento
 */
export async function reportAnalysisRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ReportAnalysisRequest }>(
    "/api/report-analysis",
    {
      schema: {
        tags: reportAnalysisRouteSchema.tags,
        summary: reportAnalysisRouteSchema.summary,
        description: reportAnalysisRouteSchema.description,
        consumes: ["multipart/form-data", "application/json"],
        response: reportAnalysisRouteSchema.response,
      },
      attachValidation: true,
    },
    async (request, reply) => {
      try {
        if (request.validationError && !request.isMultipart()) {
          return reply.code(400).send({
            success: false,
            error: request.validationError.message || "Erro de validação",
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

        let report: string | undefined;
        let description: string | undefined;
        let audio: Buffer | undefined;
        let audioMimeType: string | undefined;

        if (request.isMultipart()) {
          const parts = request.parts();

          for await (const part of parts) {
            if (part.type === "file") {
              if (part.fieldname === "audio") {
                const buffer = await part.toBuffer();
                audio = buffer;
                audioMimeType = part.mimetype || "audio/mpeg";
              }
            } else {
              if (part.fieldname === "report") {
                report = part.value as string;
              }
              if (part.fieldname === "description") {
                description = part.value as string;
              }
            }
          }
        } else {
          const body = request.body as ReportAnalysisRequest;

          if (!body || typeof body !== "object") {
            return reply.code(400).send({
              success: false,
              error: "Body deve ser um objeto JSON válido",
            });
          }

          report = body.report;
          description = body.description;
        }

        const hasReport = report && report.trim().length > 0;
        const hasDescription = description && description.trim().length > 0;
        const hasAudio = audio && audio.length > 0;

        if (!hasReport) {
          return reply.code(400).send({
            success: false,
            error: "É necessário fornecer o campo report (texto) com a solicitação do suporte",
          });
        }

        if (!hasDescription && !hasAudio) {
          return reply.code(400).send({
            success: false,
            error:
              "É necessário fornecer pelo menos uma descrição (texto) ou um arquivo de áudio",
          });
        }

        const result = await aiService.processReportAnalysis({
          report: report as string,
          description,
          audio,
          audioMimeType,
        });

        if (!result.success) {
          const statusCode =
            result.error?.includes("insuficiente") ||
            result.error?.includes("muito curto") ||
            result.error?.includes("não contém informações") ||
            result.error?.includes("não foi possível identificar")
              ? 422
              : 400;

          return reply.code(statusCode).send(result);
        }

        return reply.code(200).send(result);
      } catch (error: any) {
        fastify.log.error(error, "Erro ao processar análise de report");
        return reply.code(500).send({
          success: false,
          error: error.message || "Erro interno do servidor",
        });
      }
    },
  );
}
