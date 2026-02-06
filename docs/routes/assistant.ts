/**
 * Documentação Swagger para rota do assistente
 */

import { assistantRequestSchemaDocs, assistantResponseSchemaDocs } from '../schemas/assistant.js';
import { errorResponseSchema } from '../schemas/common.js';

export const assistantRouteSchema = {
  tags: ['assistant'],
  summary: 'Processar relatório com IA',
  description: `Processa uma descrição (texto ou áudio) de bug/melhoria/requisito e retorna JSON estruturado para preenchimento automático de formulários. 

A IA identifica automaticamente:
- **Produto**: Identifica o produto/aplicação mencionado no conteúdo (um produto por report)
- **Usuários**: Identifica usuários mencionados por nome de suporte, Discord ou referências indiretas

Aceita multipart/form-data (com campo "description" e/ou arquivo "audio") ou application/json (apenas "description").

Os dados de produtos e usuários são carregados automaticamente dos arquivos \`data/products.json\` e \`data/users.json\`.`,
  body: assistantRequestSchemaDocs,
  response: {
    200: {
      description: 'Processamento realizado com sucesso. Retorna dados estruturados incluindo produto e usuários identificados pela IA.',
      ...assistantResponseSchemaDocs,
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
