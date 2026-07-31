/**
 * Documentação Swagger para a rota de geração do Registro de Liberação
 */

import {
  releaseNotesParamsSchema,
  releaseNotesParamsSchemaDocs,
  releaseNotesQueryParamsSchema,
  releaseNotesQueryParamsSchemaDocs,
  releaseNotesResponseSchemaDocs,
} from "../schemas/release-notes.js";
import { errorResponseSchema } from "../schemas/common.js";

export const releaseNotesRouteSchema = {
  tags: ["release-notes"],
  summary: "Gerar Registro de Liberação via IA",
  description: `Consulta a API SoftFlow (\`GET /api/sprint/liberacoes/{liberacaoId}/itens\`, paginada) para obter todos os itens de um registro de liberação e usa IA para gerar o documento de Registro de Liberação em Markdown, categorizando automaticamente os itens em Bugs Corrigidos, Melhorias Implementadas, Requisitos e Clientes — Casos Específicos.

**Parâmetro obrigatório:** \`liberacaoId\` (path) — id do registro de liberação no SoftFlow.

**Parâmetro opcional:** \`promptId\` (query) — id de um prompt cadastrado do tipo \`RELEASE_NOTES\` (ver \`/api/form-assistant-prompts?tipo=RELEASE_NOTES\`). Sem ele, usa o prompt DEFAULT do tipo.`,
  params: releaseNotesParamsSchema,
  paramsDocs: releaseNotesParamsSchemaDocs,
  querystring: releaseNotesQueryParamsSchema,
  querystringDocs: releaseNotesQueryParamsSchemaDocs,
  response: {
    200: {
      description: "Registro de Liberação gerado com sucesso.",
      ...releaseNotesResponseSchemaDocs,
    },
    400: {
      description: "Parâmetros inválidos",
      ...errorResponseSchema,
    },
    404: {
      description:
        "Nenhum item encontrado para o registro de liberação informado, ou promptId inexistente para o tipo RELEASE_NOTES",
      ...errorResponseSchema,
    },
    503: {
      description: "Serviço de IA indisponível",
      ...errorResponseSchema,
    },
    500: {
      description: "Erro interno do servidor",
      ...errorResponseSchema,
    },
  },
};
