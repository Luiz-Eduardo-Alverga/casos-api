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
        consumes: ['multipart/form-data', 'application/json'], // Aceitar ambos
        // Body schema removido da validação automática para permitir multipart
        // Será validado manualmente apenas para JSON
        response: assistantRouteSchema.response, // Schema de documentação (com example)
      },
      // Desabilitar validação automática do body para permitir multipart
      attachValidation: true,
    },
    async (request, reply) => {
      try {
        // Verificar erros de validação (apenas para JSON)
        if (request.validationError && !request.isMultipart()) {
          return reply.code(400).send({
            success: false,
            error: request.validationError.message || 'Erro de validação',
          });
        }

        // Verificar se o serviço está disponível
        const aiService = (fastify as any).aiService as AIService | undefined;

        if (!aiService) {
          return reply.code(503).send({
            success: false,
            error: 'Serviço de IA não está disponível. Verifique a configuração da GEMINI_API_KEY.',
          });
        }

        let description: string | undefined;
        let audio: Buffer | undefined;
        let audioMimeType: string | undefined;

        // Verificar se é multipart/form-data
        if (request.isMultipart()) {
          // Processar todos os campos e arquivos do multipart
          const parts = request.parts();
          
          for await (const part of parts) {
            if (part.type === 'file') {
              // É um arquivo (áudio)
              if (part.fieldname === 'audio') {
                const buffer = await part.toBuffer();
                audio = buffer;
                audioMimeType = part.mimetype || 'audio/mpeg';
              }
            } else {
              // É um campo de texto
              if (part.fieldname === 'description') {
                description = part.value as string;
              }
            }
          }
        } else {
          // Se for JSON, validar e usar o body diretamente
          const body = request.body as AssistantRequest;
          
          // Validação manual para JSON
          if (!body || typeof body !== 'object') {
            return reply.code(400).send({
              success: false,
              error: 'Body deve ser um objeto JSON válido',
            });
          }
          
          description = body.description;
        }

        // Validar que pelo menos um foi fornecido
        const hasDescription = description && description.trim().length > 0;
        const hasAudio = audio && audio.length > 0;

        if (!hasDescription && !hasAudio) {
          return reply.code(400).send({
            success: false,
            error: 'É necessário fornecer pelo menos uma descrição (texto) ou um arquivo de áudio',
          });
        }

        const result = await aiService.processReport({ 
          description, 
          audio, 
          audioMimeType 
        });

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
