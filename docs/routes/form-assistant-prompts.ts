/**
 * Documentação Swagger para as rotas de /api/form-assistant-prompts
 */

import { errorResponseSchema } from "../schemas/common.js";
import {
  listPromptsResponseSchema,
  singlePromptResponseSchema,
  resolvedPromptResponseSchema,
  createPromptBodySchema,
  updatePromptBodySchema,
  toggleResponseSchema,
  deleteResponseSchema,
  listPromptsQueryParamsSchema,
  defaultPromptQueryParamsSchema,
} from "../schemas/form-assistant-prompts.js";

const tags = ["form-assistant-prompts"];

const notFoundResponse = {
  description: "Prompt não encontrado",
  ...errorResponseSchema,
};

const validationErrorResponse = {
  description: "Dados inválidos",
  ...errorResponseSchema,
};

export const listPromptsRouteSchema = {
  tags,
  summary: "Listar prompts",
  description:
    "Retorna os prompts cadastrados (DEFAULT e por Squad) filtrados por `tipo` (default: `FORM_ASSISTANT`) e, opcionalmente, por `squadSetor`. Para o tipo `RELEASE_NOTES` pode haver múltiplos prompts para o mesmo squad.",
  querystring: listPromptsQueryParamsSchema,
  response: {
    200: { description: "Lista de prompts", ...listPromptsResponseSchema },
    400: {
      description: "Valor de 'tipo' inválido",
      ...errorResponseSchema,
    },
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const getDefaultPromptRouteSchema = {
  tags,
  summary: "Retornar prompt DEFAULT",
  description:
    "Retorna o prompt global padrão (`squadSetor = null`) do `tipo` informado (default: `FORM_ASSISTANT`).",
  querystring: defaultPromptQueryParamsSchema,
  response: {
    200: { description: "Prompt DEFAULT", ...singlePromptResponseSchema },
    400: {
      description: "Valor de 'tipo' inválido",
      ...errorResponseSchema,
    },
    404: notFoundResponse,
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const getSquadPromptRouteSchema = {
  tags,
  summary: "Retornar prompt resolvido do Squad",
  description:
    "Retorna o prompt ativo para o squad informado. Se não houver prompt cadastrado, retorna o DEFAULT com `isDefault: true`.",
  params: {
    type: "object",
    properties: {
      setor: {
        type: "string",
        description: "Setor do squad (ex: SQUAD BACKOFFICE)",
      },
    },
    required: ["setor"],
  },
  response: {
    200: { description: "Prompt resolvido", ...resolvedPromptResponseSchema },
    400: validationErrorResponse,
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const createPromptRouteSchema = {
  tags,
  summary: "Criar prompt",
  description:
    "Cria um novo prompt do `tipo` informado (default: `FORM_ASSISTANT`).\n\n- Para `FORM_ASSISTANT`: `squadSetor` é obrigatório e deve começar com 'SQUAD'; só é permitido 1 prompt ativo por squad (retorna 409 se já existir).\n- Para os demais tipos (ex.: `RELEASE_NOTES`): `squadSetor` é opcional (se informado, deve começar com 'SQUAD') e múltiplos prompts podem ser cadastrados para o mesmo squad — não há checagem de conflito.\n\nO `template` contém apenas as regras editáveis — para `FORM_ASSISTANT`, identificação de produtos/usuários e contrato JSON são montados automaticamente pelo sistema.",
  body: createPromptBodySchema,
  response: {
    201: { description: "Prompt criado", ...singlePromptResponseSchema },
    400: validationErrorResponse,
    409: {
      description: "Já existe um prompt FORM_ASSISTANT para este squad",
      ...errorResponseSchema,
    },
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const updatePromptRouteSchema = {
  tags,
  summary: "Editar prompt (nome e/ou template)",
  description:
    "Atualiza o nome e/ou template editável de um prompt existente (inclusive o DEFAULT). O `template` contém apenas regras do Squad — blocos fixos do sistema são adicionados automaticamente em runtime.",
  params: {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  },
  body: updatePromptBodySchema,
  response: {
    200: { description: "Prompt atualizado", ...singlePromptResponseSchema },
    400: validationErrorResponse,
    404: notFoundResponse,
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const togglePromptRouteSchema = {
  tags,
  summary: "Ativar/desativar prompt de Squad",
  description:
    "Alterna o status `isActive` de um prompt de Squad. Quando desativado, o Squad passa a usar o DEFAULT. Não é permitido desativar o prompt DEFAULT.",
  params: {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  },
  response: {
    200: { description: "Status alternado", ...toggleResponseSchema },
    400: validationErrorResponse,
    404: notFoundResponse,
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};

export const deletePromptRouteSchema = {
  tags,
  summary: "Remover prompt de Squad",
  description:
    "Remove o prompt de um Squad. Não é permitido remover o prompt DEFAULT (`squadSetor: null`).",
  params: {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  },
  response: {
    200: { description: "Prompt removido", ...deleteResponseSchema },
    400: validationErrorResponse,
    404: notFoundResponse,
    500: { description: "Erro interno", ...errorResponseSchema },
  },
};
