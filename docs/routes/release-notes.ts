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

**Parâmetro opcional:** \`promptId\` (query) — id de um prompt cadastrado do tipo \`RELEASE_NOTES\` (ver \`/api/form-assistant-prompts?tipo=RELEASE_NOTES\`). Sem ele, usa o prompt DEFAULT do tipo.

Para progresso em tempo real no front, use \`GET /api/release-notes/:liberacaoId/stream\` (SSE).`,
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

export const releaseNotesStreamRouteSchema = {
  tags: ["release-notes"],
  summary: "Gerar Registro de Liberação via IA (SSE com progresso)",
  description: `Mesmo fluxo do \`GET /api/release-notes/:liberacaoId\`, mas responde com **Server-Sent Events** (\`text/event-stream\`) emitindo progresso real das etapas do backend e chunks do Markdown gerado pela IA.

**Eventos SSE:**
- \`progress\` — etapa atual (\`step\`, \`totalSteps\`, \`stepId\`, \`percent\`, \`title\`, \`detail\`, \`totalCasos?\`)
- \`delta\` — trecho incremental do Markdown durante \`generate_ai\` (\`{ chunk: string }\`). O client deve concatenar os chunks. No \`done\`, use \`data.registro_liberacao\` como fonte da verdade.
- \`done\` — resultado final (mesmo JSON de sucesso do endpoint síncrono)
- \`fail\` — falha de negócio (\`{ success: false, error, processedIn? }\`). Nome diferente de \`error\` para não conflitar com o evento nativo de rede do EventSource.

**Etapas reais (\`stepId\`):**
1. \`fetch_softflow\` — leitura dos itens na Softflow
2. \`extract_tickets\` — extração/organização dos casos
3. \`resolve_prompt\` — resolução do prompt
4. \`generate_ai\` — geração com IA (stream de tokens → eventos \`delta\`)
5. \`finalize\` — validação/finalização

O percentual é aproximado por etapa (não é % real da OpenAI). Se o client fechar a conexão, a chamada à IA é abortada.`,
  params: releaseNotesParamsSchema,
  paramsDocs: releaseNotesParamsSchemaDocs,
  querystring: releaseNotesQueryParamsSchema,
  querystringDocs: releaseNotesQueryParamsSchemaDocs,
  produces: ["text/event-stream"],
  response: {
    400: {
      description: "Parâmetros inválidos (antes de abrir o stream)",
      ...errorResponseSchema,
    },
    503: {
      description: "Serviço de IA indisponível (antes de abrir o stream)",
      ...errorResponseSchema,
    },
  },
};
