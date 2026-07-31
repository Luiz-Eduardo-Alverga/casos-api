/**
 * Schemas JSON para validação e documentação dos endpoints /api/form-assistant-prompts
 */

export const promptTypeSchema = {
  type: "string",
  enum: ["FORM_ASSISTANT", "RELEASE_NOTES"],
  description:
    "Diferencia o uso do prompt: FORM_ASSISTANT (abertura de caso, 1 por squad) ou RELEASE_NOTES (Registro de Liberação, N por squad — o cliente escolhe qual usar via promptId).",
};

export const promptObjectSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid", example: "ed26d196-808a-4cc5-ab5d-ea4115afd0ca" },
    squadSetor: {
      type: ["string", "null"],
      example: "SQUAD BACKOFFICE",
      description: "null = prompt DEFAULT global",
    },
    tipo: { ...promptTypeSchema, example: "FORM_ASSISTANT" },
    name: { type: "string", example: "Backoffice - Abertura de Caso" },
    isActive: { type: "boolean", example: true },
    template: {
      type: "string",
      description:
        "Parte editável do prompt (regras de comportamento e formatos de description por categoria). Identificação de produtos/usuários e contrato JSON são adicionados automaticamente pelo sistema.",
      example:
        "Você é um assistente especializado...\n\n### REGRAS DE COMPORTAMENTO E EXTRAÇÃO:\n- Padronização de Título: ...",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "squadSetor", "tipo", "name", "isActive", "template"],
};

export const resolvedPromptObjectSchema = {
  type: "object",
  properties: {
    ...promptObjectSchema.properties,
    isDefault: {
      type: "boolean",
      example: false,
      description: "true quando o prompt retornado é o DEFAULT (squad sem prompt próprio ou setor não é squad)",
    },
  },
  required: [...promptObjectSchema.required, "isDefault"],
};

export const createPromptBodySchema = {
  type: "object",
  properties: {
    squadSetor: {
      type: "string",
      description:
        "Setor do squad, deve começar com 'SQUAD'. Obrigatório para tipo FORM_ASSISTANT (1 prompt por squad). Opcional para os demais tipos (ex.: RELEASE_NOTES, que permite múltiplos prompts por squad ou globais).",
      example: "SQUAD XP",
    },
    tipo: {
      ...promptTypeSchema,
      description: `${promptTypeSchema.description} Default: "FORM_ASSISTANT" quando omitido.`,
      example: "FORM_ASSISTANT",
    },
    name: {
      type: "string",
      description: "Nome descritivo do prompt.",
      example: "XP - Abertura de Caso",
    },
    template: {
      type: "string",
      description:
        "Conteúdo editável do prompt. Para FORM_ASSISTANT, não inclua listas de produtos/usuários nem o schema JSON — o sistema adiciona automaticamente.",
      example: "Você é um assistente especializado em processar relatórios...",
    },
  },
  required: ["name", "template"],
};

export const listPromptsQueryParamsSchema = {
  type: "object",
  properties: {
    tipo: {
      ...promptTypeSchema,
      description: `${promptTypeSchema.description} Default: "FORM_ASSISTANT" quando omitido.`,
    },
    squadSetor: {
      type: "string",
      description: "Filtra a lista por um squad específico (ex.: 'SQUAD XP').",
    },
  },
};

export const defaultPromptQueryParamsSchema = {
  type: "object",
  properties: {
    tipo: {
      ...promptTypeSchema,
      description: `${promptTypeSchema.description} Default: "FORM_ASSISTANT" quando omitido.`,
    },
  },
};

export const updatePromptBodySchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Novo nome do prompt.",
      example: "XP - Abertura de Caso v2",
    },
    template: {
      type: "string",
      description:
        "Novas regras editáveis do Squad. Não inclua listas de produtos/usuários nem o schema JSON.",
    },
  },
};

export const listPromptsResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: {
      type: "array",
      items: promptObjectSchema,
    },
  },
  required: ["success", "data"],
};

export const singlePromptResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: promptObjectSchema,
  },
  required: ["success", "data"],
};

export const resolvedPromptResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: resolvedPromptObjectSchema,
  },
  required: ["success", "data"],
};

export const toggleResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        isActive: { type: "boolean", example: false },
      },
      required: ["id", "isActive"],
    },
  },
  required: ["success", "data"],
};

export const deleteResponseSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    message: { type: "string", example: "Prompt do SQUAD XP removido com sucesso." },
  },
  required: ["success", "message"],
};
