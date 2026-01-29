/**
 * Documentação Swagger para rota do assistente
 */

import { assistantRequestSchemaDocs, assistantResponseSchemaDocs } from '../schemas/assistant.js';
import { errorResponseSchema } from '../schemas/common.js';

export const assistantRouteSchema = {
  tags: ['assistant'],
  summary: 'Processar relatório com IA',
  description: 'Processa uma descrição de bug/melhoria/requisito e retorna JSON estruturado para preenchimento automático de formulários',
  body: assistantRequestSchemaDocs,
  response: {
    200: {
      description: 'Processamento realizado com sucesso',
      ...assistantResponseSchemaDocs,
    },
    400: {
      description: 'Erro de validação',
      ...errorResponseSchema,
    },
    500: {
      description: 'Erro interno do servidor',
      ...errorResponseSchema,
    },
  },
};
