import { AIService } from "./ai-service.js";
import { softFlowClient } from "./softflow-client.js";
import { promptRepository } from "./prompt-repository.js";
import {
  extractTickets,
  resolveProdutoEVersoes,
} from "./release-notes-preprocessor.js";
import {
  buildReleaseNotesPrompt,
  DEFAULT_RELEASE_NOTES_TEMPLATE,
} from "../prompts/release-notes.js";
import type {
  ReleaseNotesRequest,
  ReleaseNotesResponse,
  SoftFlowLiberacaoItem,
  SoftFlowLiberacaoItensResponse,
} from "../types/release-notes.js";
import type { PromptType } from "../types/form-assistant-prompts.js";

const RELEASE_NOTES_TIPO: PromptType = "RELEASE_NOTES";
const PAGE_LIMIT = 100;
/** Limite de segurança para evitar loop infinito caso a API se comporte de forma inesperada. */
const MAX_PAGES = 50;

export const NENHUM_ITEM_ENCONTRADO_ERROR =
  "Nenhum item encontrado para o registro de liberação informado.";

/**
 * Orquestra o fluxo completo de geração do Registro de Liberação:
 * API SoftFlow (paginada, todos os itens) → prompt (banco ou fallback) → IA → Markdown.
 */
export class ReleaseNotesService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async analyze(request: ReleaseNotesRequest): Promise<ReleaseNotesResponse> {
    const startTime = Date.now();

    try {
      const items = await this.buscarItens(request.liberacaoId);
      const tickets = extractTickets(items);

      if (tickets.length === 0) {
        return {
          success: false,
          error: NENHUM_ITEM_ENCONTRADO_ERROR,
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      const { produto, versoes } = resolveProdutoEVersoes(tickets);
      const template = await this.resolverTemplate(request.promptId);
      const prompt = buildReleaseNotesPrompt(template, produto, versoes, tickets);

      const registroLiberacao = await this.aiService.generateText(prompt, {
        temperature: 0.2,
        // Lista grande de tickets + possível rascunho em passos_para_reproduzir
        maxTokens: 8192,
      });

      if (!registroLiberacao) {
        return {
          success: false,
          error: "Resposta da IA está vazia",
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      return {
        success: true,
        data: {
          registro_liberacao: registroLiberacao,
          produto,
          versoes,
          total_casos: tickets.length,
        },
        processedIn: `${Date.now() - startTime}ms`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erro ao gerar Registro de Liberação",
        processedIn: `${Date.now() - startTime}ms`,
      };
    }
  }

  /**
   * Busca todos os itens de uma liberação, paginando por offset/limit
   * até que a API retorne next_offset = null.
   */
  private async buscarItens(
    liberacaoId: string,
  ): Promise<SoftFlowLiberacaoItem[]> {
    const items: SoftFlowLiberacaoItem[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await softFlowClient.get<SoftFlowLiberacaoItensResponse>(
        `/api/sprint/liberacoes/${liberacaoId}/itens`,
        { limit: String(PAGE_LIMIT), offset: String(offset) },
      );

      if (!response || !Array.isArray(response.data)) {
        throw new Error("Resposta inválida da API externa SoftFlow");
      }

      items.push(...response.data);

      if (response.next_offset === null || response.next_offset === undefined) {
        break;
      }
      offset = response.next_offset;
    }

    return items;
  }

  /**
   * Resolve o template editável a usar:
   * 1. Se promptId informado → busca o prompt do tipo RELEASE_NOTES com aquele id.
   * 2. Caso contrário → usa o prompt DEFAULT do tipo (squad_setor IS NULL).
   * 3. Se o banco estiver vazio/indisponível → usa fallback hardcoded.
   */
  private async resolverTemplate(promptId?: string): Promise<string> {
    if (promptId) {
      const prompt = await promptRepository.findByIdAndType(
        promptId,
        RELEASE_NOTES_TIPO,
      );
      if (!prompt) {
        throw new Error(
          `Prompt '${promptId}' não encontrado para o tipo ${RELEASE_NOTES_TIPO}.`,
        );
      }
      return prompt.template;
    }

    const defaultPrompt = await promptRepository.findDefault(RELEASE_NOTES_TIPO);
    return defaultPrompt?.template ?? DEFAULT_RELEASE_NOTES_TEMPLATE;
  }
}
