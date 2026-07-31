/**
 * Schemas JSON para validação e documentação do endpoint /api/release-notes/:liberacaoId
 */

export const releaseNotesParamsSchema = {
  type: "object",
  properties: {
    liberacaoId: {
      type: "string",
      description: "Id do registro de liberação no SoftFlow.",
    },
  },
  required: ["liberacaoId"],
};

export const releaseNotesParamsSchemaDocs = {
  type: "object",
  properties: {
    liberacaoId: {
      type: "string",
      description: "Id do registro de liberação no SoftFlow.",
      example: "1057",
    },
  },
  required: ["liberacaoId"],
};

export const releaseNotesQueryParamsSchema = {
  type: "object",
  properties: {
    promptId: {
      type: "string",
      format: "uuid",
      description:
        "Id de um prompt cadastrado do tipo RELEASE_NOTES (ver /api/form-assistant-prompts?tipo=RELEASE_NOTES). Sem esse parâmetro, usa o prompt DEFAULT do tipo.",
    },
  },
};

export const releaseNotesQueryParamsSchemaDocs = {
  type: "object",
  properties: {
    promptId: {
      type: "string",
      format: "uuid",
      description:
        "Id de um prompt cadastrado do tipo RELEASE_NOTES (ver /api/form-assistant-prompts?tipo=RELEASE_NOTES). Sem esse parâmetro, usa o prompt DEFAULT do tipo.",
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    },
  },
};

export const releaseNotesDataSchemaDocs = {
  type: "object",
  properties: {
    registro_liberacao: {
      type: "string",
      description: "Documento do Registro de Liberação gerado pela IA, em Markdown.",
      example:
        "## 📌 REGISTRO DE LIBERAÇÃO – HOTFIX\n\n**Produto:** Smart (Softcom Smart)\n**Versão:** 8.0.0.0\n**Status:** Aberto\n**Tipo:** Correções e Melhorias\n\n### 1. BUGS CORRIGIDOS\n\n...",
    },
    produto: {
      type: "string",
      description: "Produto(s) identificado(s) nos itens da liberação.",
      example: "Smart (Softcom Smart)",
    },
    versoes: {
      type: "array",
      items: { type: "string" },
      description: "Versão(ões) distintas presentes nos itens da liberação.",
      example: ["8.0.0.0"],
    },
    total_casos: {
      type: "number",
      description: "Total de casos considerados na análise.",
      example: 2,
    },
  },
  required: ["registro_liberacao", "produto", "versoes", "total_casos"],
};

export const releaseNotesResponseSchemaDocs = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: releaseNotesDataSchemaDocs,
    processedIn: {
      type: "string",
      description: "Tempo total de processamento",
      example: "3450ms",
    },
    error: {
      type: "string",
      example: "Mensagem de erro (apenas em caso de falha)",
    },
  },
  required: ["success"],
};
