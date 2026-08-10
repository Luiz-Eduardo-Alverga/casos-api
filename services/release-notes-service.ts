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
  ReleaseNotesAnalyzeOptions,
  ReleaseNotesProgressEvent,
  ReleaseNotesProgressStepId,
  ReleaseNotesRequest,
  ReleaseNotesResponse,
  SoftFlowLiberacaoItem,
  SoftFlowLiberacaoItensResponse,
} from "../types/release-notes.js";
import { RELEASE_NOTES_TOTAL_STEPS } from "../types/release-notes.js";
import type { PromptType } from "../types/form-assistant-prompts.js";

const RELEASE_NOTES_TIPO: PromptType = "RELEASE_NOTES";
const PAGE_LIMIT = 100;
/** Limite de segurança para evitar loop infinito caso a API se comporte de forma inesperada. */
const MAX_PAGES = 50;

/** Buffer do SSE `delta`: evita um evento por token da OpenAI. */
const DELTA_FLUSH_CHARS = 120;
const DELTA_FLUSH_MS = 150;

export const NENHUM_ITEM_ENCONTRADO_ERROR =
  "Nenhum item encontrado para o registro de liberação informado.";

const STEP_META: Record<
  ReleaseNotesProgressStepId,
  { step: number; title: string; percentStart: number }
> = {
  fetch_softflow: {
    step: 1,
    title: "Leitura de tickets e metadados",
    percentStart: 5,
  },
  extract_tickets: {
    step: 2,
    title: "Extração e organização dos casos",
    percentStart: 35,
  },
  resolve_prompt: {
    step: 3,
    title: "Resolução do prompt",
    percentStart: 50,
  },
  generate_ai: {
    step: 4,
    title: "Redação do registro com IA",
    percentStart: 60,
  },
  finalize: {
    step: 5,
    title: "Formatação e validação",
    percentStart: 95,
  },
};

/**
 * Orquestra o fluxo completo de geração do Registro de Liberação:
 * API SoftFlow (paginada, todos os itens) → prompt (banco ou fallback) → IA → Markdown.
 */
export class ReleaseNotesService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async analyze(
    request: ReleaseNotesRequest,
    options?: ReleaseNotesAnalyzeOptions,
  ): Promise<ReleaseNotesResponse> {
    const startTime = Date.now();
    const { onProgress, onDelta, signal } = options ?? {};
    const emit = (
      stepId: ReleaseNotesProgressStepId,
      detail: string,
      overrides?: Partial<Pick<ReleaseNotesProgressEvent, "percent" | "totalCasos">>,
    ) => {
      if (!onProgress) return;
      const meta = STEP_META[stepId];
      onProgress({
        step: meta.step,
        totalSteps: RELEASE_NOTES_TOTAL_STEPS,
        stepId,
        percent: overrides?.percent ?? meta.percentStart,
        title: meta.title,
        detail,
        totalCasos: overrides?.totalCasos,
      });
    };

    try {
      this.throwIfAborted(signal);

      emit(
        "fetch_softflow",
        "Conectando à Softflow e buscando itens da liberação...",
        { percent: 5 },
      );

      const items = await this.buscarItens(request.liberacaoId, (pageInfo) => {
        emit(
          "fetch_softflow",
          pageInfo.hasMore
            ? `Carregando itens da Softflow (página ${pageInfo.page}, ${pageInfo.loaded} casos até agora)...`
            : `Itens carregados da Softflow (${pageInfo.loaded} casos).`,
          {
            percent: Math.min(30, 5 + pageInfo.page * 8),
            totalCasos: pageInfo.loaded,
          },
        );
      });

      this.throwIfAborted(signal);

      emit(
        "extract_tickets",
        `Organizando ${items.length} casos para análise...`,
        { percent: 35, totalCasos: items.length },
      );

      const tickets = extractTickets(items);

      if (tickets.length === 0) {
        return {
          success: false,
          error: NENHUM_ITEM_ENCONTRADO_ERROR,
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      const { produto, versoes } = resolveProdutoEVersoes(tickets);

      emit(
        "extract_tickets",
        `${tickets.length} casos prontos · produto ${produto} · versão ${versoes.join(", ") || "n/d"}`,
        { percent: 45, totalCasos: tickets.length },
      );

      emit(
        "resolve_prompt",
        request.promptId
          ? "Carregando prompt selecionado..."
          : "Carregando prompt padrão de Registro de Liberação...",
        { percent: 50, totalCasos: tickets.length },
      );

      const template = await this.resolverTemplate(request.promptId);
      const prompt = buildReleaseNotesPrompt(
        template,
        produto,
        versoes,
        tickets,
      );

      this.throwIfAborted(signal);

      emit(
        "generate_ai",
        `Gerando registro de liberação com IA a partir de ${tickets.length} casos...`,
        { percent: 65, totalCasos: tickets.length },
      );

      const aiConfig = {
        temperature: 0.2,
        // Lista grande de tickets + possível rascunho em passos_para_reproduzir
        maxTokens: 8192,
      };

      let registroLiberacao: string;

      if (onDelta) {
        let charCount = 0;
        let lastProgressAt = 0;
        let deltaBuffer = "";
        let lastDeltaFlushAt = Date.now();

        const flushDelta = () => {
          if (!deltaBuffer) return;
          onDelta({ chunk: deltaBuffer });
          deltaBuffer = "";
          lastDeltaFlushAt = Date.now();
        };

        registroLiberacao = await this.aiService.generateTextStream(
          prompt,
          (chunk) => {
            charCount += chunk.length;
            deltaBuffer += chunk;

            const elapsed = Date.now() - lastDeltaFlushAt;
            if (
              deltaBuffer.length >= DELTA_FLUSH_CHARS ||
              elapsed >= DELTA_FLUSH_MS
            ) {
              flushDelta();
            }

            // Atualiza o detalhe da etapa ~a cada ~400 chars (evita flood de progress)
            if (charCount - lastProgressAt >= 400) {
              lastProgressAt = charCount;
              const softPercent = Math.min(
                90,
                65 + Math.floor(charCount / 120),
              );
              emit(
                "generate_ai",
                `Recebendo Markdown da IA (${charCount} caracteres)...`,
                { percent: softPercent, totalCasos: tickets.length },
              );
            }
          },
          { ...aiConfig, signal },
        );

        flushDelta();
      } else {
        registroLiberacao = await this.aiService.generateText(prompt, aiConfig);
      }

      if (!registroLiberacao) {
        return {
          success: false,
          error: "Resposta da IA está vazia",
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      emit(
        "finalize",
        "Validando e finalizando o documento em Markdown...",
        { percent: 95, totalCasos: tickets.length },
      );

      emit("finalize", "Registro de liberação gerado com sucesso.", {
        percent: 100,
        totalCasos: tickets.length,
      });

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
      if (this.isAbortError(error) || signal?.aborted) {
        return {
          success: false,
          error: "Geração cancelada (cliente desconectou).",
          processedIn: `${Date.now() - startTime}ms`,
        };
      }
      return {
        success: false,
        error: error.message || "Erro ao gerar Registro de Liberação",
        processedIn: `${Date.now() - startTime}ms`,
      };
    }
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
  }

  private isAbortError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.name === "AbortError" ||
      error.name === "APIUserAbortError" ||
      /abort/i.test(error.message)
    );
  }

  /**
   * Busca todos os itens de uma liberação, paginando por offset/limit
   * até que a API retorne next_offset = null.
   */
  private async buscarItens(
    liberacaoId: string,
    onPage?: (info: {
      page: number;
      loaded: number;
      hasMore: boolean;
    }) => void,
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

      const hasMore =
        response.next_offset !== null && response.next_offset !== undefined;

      onPage?.({
        page: page + 1,
        loaded: items.length,
        hasMore,
      });

      if (!hasMore) {
        break;
      }
      offset = response.next_offset as number;
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
