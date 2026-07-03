/**
 * Documentação Swagger para rota do assistente
 */

import { assistantRequestSchemaDocs, assistantResponseSchemaDocs } from '../schemas/assistant.js';
import { errorResponseSchema } from '../schemas/common.js';

export const assistantRouteSchema = {
  tags: ['assistant'],
  summary: 'Processar relatório com IA',
  description: `Processa uma descrição (texto ou áudio) de bug/melhoria/requisito e retorna JSON estruturado para preenchimento automático de formulários.

**Resolução de prompt por setor:**
- Envie \`squadSetor\` com o setor do usuário logado (ex: "SQUAD XP")
- Se o setor começa com "SQUAD" e existe prompt ativo cadastrado → usa o prompt do squad
- Caso contrário → usa o prompt DEFAULT global

A IA identifica automaticamente:
- **Produto**: produto/aplicação mencionado no conteúdo (um produto por report)
- **Usuários**: usuários mencionados por nome de suporte, Discord ou referências indiretas

Aceita **multipart/form-data** (campos \`description\`, \`squadSetor\` e/ou arquivo \`audio\`) ou **application/json** (\`description\`, \`squadSetor\`).

Produtos e usuários são carregados automaticamente da API Soft Flow em runtime.`,
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
