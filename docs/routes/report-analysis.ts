/**
 * Documentação Swagger para rota de análise de reports
 */

import { reportAnalysisRequestSchemaDocs, reportAnalysisResponseSchemaDocs } from '../schemas/report-analysis.js';
import { errorResponseSchema } from '../schemas/common.js';

export const reportAnalysisRouteSchema = {
  tags: ['report-analysis'],
  summary: 'Analisar report com IA (PM/PO)',
  description: `Recebe um report textual da equipe de suporte (campo \"report\") e um contexto adicional do time de desenvolvimento (campo \"description\" em texto e/ou \"audio\") e retorna uma análise técnica e de produto estruturada para ajudar o time de atendimento a refinar requisitos e validar viabilidade com desenvolvimento (QA/PM/PO).\n\nAceita multipart/form-data (com campo \"report\", opcionalmente \"description\" e/ou arquivo \"audio\") ou application/json (campos \"report\" e opcionalmente \"description\").`,
  body: reportAnalysisRequestSchemaDocs,
  response: {
    200: {
      description: 'Análise gerada com sucesso.',
      ...reportAnalysisResponseSchemaDocs,
    },
    400: {
      description: 'Erro de validação',
      ...errorResponseSchema,
    },
    422: {
      description: 'Conteúdo insuficiente ou inválido para processamento',
      ...errorResponseSchema,
    },
    500: {
      description: 'Erro interno do servidor',
      ...errorResponseSchema,
    },
  },
};

