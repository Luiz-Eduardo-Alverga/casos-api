import { FastifyInstance } from "fastify";
import { promptRepository } from "../services/prompt-repository.js";
import type {
  CreatePromptBody,
  UpdatePromptBody,
  PromptType,
} from "../types/form-assistant-prompts.js";
import {
  listPromptsRouteSchema,
  getDefaultPromptRouteSchema,
  getSquadPromptRouteSchema,
  createPromptRouteSchema,
  updatePromptRouteSchema,
  togglePromptRouteSchema,
  deletePromptRouteSchema,
} from "../docs/routes/form-assistant-prompts.js";

const VALID_TIPOS: PromptType[] = ["FORM_ASSISTANT", "RELEASE_NOTES"];
const DEFAULT_TIPO: PromptType = "FORM_ASSISTANT";

function isValidTipo(value: string): value is PromptType {
  return (VALID_TIPOS as string[]).includes(value);
}

/**
 * Rotas de gerenciamento de prompts de IA cadastráveis em banco (por tipo).
 *
 * tipo "FORM_ASSISTANT": abertura de caso, 1 prompt por squad (comportamento original).
 * tipo "RELEASE_NOTES": Registro de Liberação, N prompts por squad — squadSetor é
 * opcional e não há checagem de conflito, pois o cliente escolhe qual usar via promptId.
 */
export async function formAssistantPromptsRoutes(fastify: FastifyInstance) {
  // GET /api/form-assistant-prompts — lista prompts (filtra por tipo e, opcionalmente, squadSetor)
  fastify.get<{ Querystring: { tipo?: string; squadSetor?: string } }>(
    "/api/form-assistant-prompts",
    { schema: listPromptsRouteSchema },
    async (request, reply) => {
      try {
        const { tipo: tipoParam, squadSetor } = request.query;

        if (tipoParam && !isValidTipo(tipoParam)) {
          return reply.code(400).send({
            success: false,
            error: `Tipo inválido. Use um dos valores: ${VALID_TIPOS.join(", ")}.`,
          });
        }

        const tipo = (tipoParam as PromptType) ?? DEFAULT_TIPO;
        let data = await promptRepository.findAll(tipo);

        if (squadSetor) {
          data = data.filter((p) => p.squadSetor === squadSetor);
        }

        return reply.code(200).send({ success: true, data });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao listar prompts");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // GET /api/form-assistant-prompts/default — retorna o prompt DEFAULT do tipo informado
  fastify.get<{ Querystring: { tipo?: string } }>(
    "/api/form-assistant-prompts/default",
    { schema: getDefaultPromptRouteSchema },
    async (request, reply) => {
      try {
        const { tipo: tipoParam } = request.query;

        if (tipoParam && !isValidTipo(tipoParam)) {
          return reply.code(400).send({
            success: false,
            error: `Tipo inválido. Use um dos valores: ${VALID_TIPOS.join(", ")}.`,
          });
        }

        const tipo = (tipoParam as PromptType) ?? DEFAULT_TIPO;
        const data = await promptRepository.findDefault(tipo);
        if (!data) {
          return reply.code(404).send({
            success: false,
            error: "Prompt DEFAULT não encontrado no banco.",
          });
        }
        return reply.code(200).send({ success: true, data });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao buscar prompt default");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // GET /api/form-assistant-prompts/squad/:setor — retorna prompt resolvido do squad (tipo FORM_ASSISTANT)
  fastify.get<{ Params: { setor: string } }>(
    "/api/form-assistant-prompts/squad/:setor",
    { schema: getSquadPromptRouteSchema },
    async (request, reply) => {
      try {
        const { setor } = request.params;

        if (!setor?.startsWith("SQUAD")) {
          return reply.code(400).send({
            success: false,
            error: "O parâmetro 'setor' deve começar com 'SQUAD'.",
          });
        }

        const squadPrompt = await promptRepository.findBySquad(setor);

        if (squadPrompt) {
          return reply.code(200).send({
            success: true,
            data: { ...squadPrompt, isDefault: false },
          });
        }

        const defaultPrompt = await promptRepository.findDefault();
        if (defaultPrompt) {
          return reply.code(200).send({
            success: true,
            data: { ...defaultPrompt, isDefault: true },
          });
        }

        return reply.code(404).send({
          success: false,
          error: "Nenhum prompt encontrado (nem do squad, nem DEFAULT).",
        });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao buscar prompt do squad");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // POST /api/form-assistant-prompts — cria um prompt
  fastify.post<{ Body: CreatePromptBody }>(
    "/api/form-assistant-prompts",
    { schema: createPromptRouteSchema },
    async (request, reply) => {
      try {
        const { squadSetor, name, template, tipo: tipoParam } = request.body;

        if (tipoParam && !isValidTipo(tipoParam)) {
          return reply.code(400).send({
            success: false,
            error: `Tipo inválido. Use um dos valores: ${VALID_TIPOS.join(", ")}.`,
          });
        }

        const tipo: PromptType = tipoParam ?? DEFAULT_TIPO;

        if (tipo === "FORM_ASSISTANT") {
          // Comportamento original: 1 prompt por squad, squadSetor obrigatório.
          if (!squadSetor?.startsWith("SQUAD")) {
            return reply.code(400).send({
              success: false,
              error:
                "O campo 'squadSetor' deve começar com 'SQUAD'. Outros setores usam o prompt DEFAULT.",
            });
          }

          const existing = await promptRepository.findBySquad(squadSetor, tipo);
          if (existing) {
            return reply.code(409).send({
              success: false,
              error: `Já existe um prompt cadastrado para o setor '${squadSetor}'. Use PUT para editar.`,
            });
          }
        } else if (squadSetor && !squadSetor.startsWith("SQUAD")) {
          // Demais tipos (ex.: RELEASE_NOTES): squadSetor é opcional, mas se informado
          // deve seguir o mesmo padrão. Múltiplos prompts por squad são permitidos.
          return reply.code(400).send({
            success: false,
            error: "O campo 'squadSetor', quando informado, deve começar com 'SQUAD'.",
          });
        }

        const data = await promptRepository.create({
          squadSetor,
          tipo,
          name,
          template,
        });
        return reply.code(201).send({ success: true, data });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao criar prompt");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // PUT /api/form-assistant-prompts/:id — edita nome e/ou template
  fastify.put<{ Params: { id: string }; Body: UpdatePromptBody }>(
    "/api/form-assistant-prompts/:id",
    { schema: updatePromptRouteSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name, template } = request.body;

        if (!name && !template) {
          return reply.code(400).send({
            success: false,
            error: "Informe ao menos 'name' ou 'template' para atualizar.",
          });
        }

        const existing = await promptRepository.findById(id);
        if (!existing) {
          return reply.code(404).send({ success: false, error: "Prompt não encontrado." });
        }

        const data = await promptRepository.update(id, { name, template });
        return reply.code(200).send({ success: true, data });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao atualizar prompt");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // PATCH /api/form-assistant-prompts/:id/toggle — ativa/desativa
  fastify.patch<{ Params: { id: string } }>(
    "/api/form-assistant-prompts/:id/toggle",
    { schema: togglePromptRouteSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const existing = await promptRepository.findById(id);
        if (!existing) {
          return reply.code(404).send({ success: false, error: "Prompt não encontrado." });
        }

        if (existing.squadSetor === null) {
          return reply.code(400).send({
            success: false,
            error: "O prompt DEFAULT não pode ser desativado.",
          });
        }

        const updated = await promptRepository.toggleActive(id);
        return reply.code(200).send({
          success: true,
          data: { id: updated!.id, isActive: updated!.isActive },
        });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao alternar status do prompt");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );

  // DELETE /api/form-assistant-prompts/:id — remove prompt de squad
  fastify.delete<{ Params: { id: string } }>(
    "/api/form-assistant-prompts/:id",
    { schema: deletePromptRouteSchema },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const existing = await promptRepository.findById(id);
        if (!existing) {
          return reply.code(404).send({ success: false, error: "Prompt não encontrado." });
        }

        if (existing.squadSetor === null) {
          return reply.code(400).send({
            success: false,
            error: "O prompt DEFAULT não pode ser removido.",
          });
        }

        await promptRepository.remove(id);

        return reply.code(200).send({
          success: true,
          message: `Prompt do ${existing.squadSetor} removido com sucesso.`,
        });
      } catch (error: any) {
        fastify.log.error(error, "Erro ao remover prompt");
        return reply.code(500).send({ success: false, error: error.message });
      }
    },
  );
}
