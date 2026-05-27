/**
 * Documentação Swagger para rota de análise de produção
 */

import {
  productionAnalysisQueryParamsSchema,
  productionAnalysisQueryParamsSchemaDocs,
  productionAnalysisResponseSchemaDocs,
  singleColaboradorResponseSchemaDocs,
} from "../schemas/production-analysis.js";
import { errorResponseSchema } from "../schemas/common.js";

export const singleColaboradorRouteSchema = {
  tags: ["production-analysis"],
  summary: "Auditar produção de um colaborador",
  description: `Consulta a API SoftFlow para um usuário específico e retorna sua auditoria de produção individual com status de conformidade, distribuição técnico/não-técnico e inconsistências detectadas.

**Parâmetros obrigatórios:** \`userId\` (path) e \`data_producao_inicio\`, \`data_producao_fim\` (query).`,
  params: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "ID do usuário no SoftFlow.",
      },
    },
    required: ["userId"],
  },
  querystring: productionAnalysisQueryParamsSchema,
  response: {
    200: {
      description: "Análise do colaborador gerada com sucesso.",
      ...singleColaboradorResponseSchemaDocs,
    },
    400: {
      description: "Parâmetros inválidos ou ausentes",
      ...errorResponseSchema,
    },
    404: {
      description: "Nenhum registro encontrado para o colaborador no período",
      ...errorResponseSchema,
    },
    503: {
      description: "Serviço de IA ou API externa indisponível",
      ...errorResponseSchema,
    },
    500: {
      description: "Erro interno do servidor",
      ...errorResponseSchema,
    },
  },
};

export const productionAnalysisRouteSchema = {
  tags: ["production-analysis"],
  summary: "Auditar produção diária do squad",
  description: `Consulta a API SoftFlow para obter os registros de horas analíticas dos colaboradores e retorna uma auditoria completa com status de conformidade (CONFORME, ALERTA_LEVE, ALERTA_CRITICO, INCONSISTENCIA), distribuição técnico/não-técnico e lista de inconsistências detectadas.

**Parâmetros obrigatórios:** \`data_producao_inicio\`, \`data_producao_fim\` e ao menos um entre \`projeto_id\` e \`usuario\`.

**Parâmetros de configuração opcionais:** permitem ajustar a meta de horas, janela comercial, limite de almoço e limiares de alerta para equipes com jornadas diferentes de 8h.`,
  querystring: productionAnalysisQueryParamsSchema,
  querystringDocs: productionAnalysisQueryParamsSchemaDocs,
  response: {
    200: {
      description: "Análise de produção gerada com sucesso.",
      ...productionAnalysisResponseSchemaDocs,
    },
    400: {
      description: "Parâmetros inválidos ou ausentes",
      ...errorResponseSchema,
    },
    503: {
      description: "Serviço de IA ou API externa indisponível",
      ...errorResponseSchema,
    },
    500: {
      description: "Erro interno do servidor",
      ...errorResponseSchema,
    },
  },
};
