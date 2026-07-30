import OpenAI from "openai";
import {
  AssistantRequest,
  AssistantResponse,
  AssistantData,
  AssistantDataFromAI,
  Product,
  User,
  ReportAnalysisRequest,
  ReportAnalysisResponse,
} from "../types/assistant.js";
import { buildFormAssistantPrompt } from "../prompts/form-assistant.js";
import { promptRepository } from "./prompt-repository.js";
import {
  fixTitleProductPrefix,
  resolveProductMatch,
} from "./product-matcher.js";
import { REPORT_ANALYSIS_PROMPT } from "../prompts/report-analysis.js";
import { softFlowClient } from "./softflow-client.js";

const DATA_TTL_MS = 10 * 10 * 1000; // 10 minutos

const AUDIO_ERROR_MESSAGE =
  "Não foi possível processar o áudio. Envie uma descrição em texto ou tente novamente.";

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

type ChatContentPart =
  | OpenAI.ChatCompletionContentPartText
  | OpenAI.ChatCompletionContentPartInputAudio;

/**
 * Serviço de integração com API OpenAI-compatible (iarouter) para processamento de relatórios
 */
export class AIService {
  private client: OpenAI;
  private modelName: string;
  private generationConfig: GenerationOptions;
  private products: Product[] = [];
  private users: User[] = [];
  private dataFetchedAt: number | null = null;

  constructor(
    apiKey: string,
    modelName = "arnaldo-combo",
    baseUrl = "https://iarouter.softcomia.com/v1",
  ) {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY é obrigatória");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
    this.modelName = modelName;

    this.generationConfig = {
      temperature: 0.2,
      maxTokens: 2048,
    };
  }

  /**
   * Garante que os dados de usuários e produtos estão carregados e frescos.
   */
  private async ensureDataLoaded(): Promise<void> {
    const now = Date.now();
    if (this.dataFetchedAt !== null && now - this.dataFetchedAt < DATA_TTL_MS)
      return;

    const [users, products] = await Promise.all([
      softFlowClient.get<User[]>("/api/auxiliar/usuarios", {
        somente_projetos: "true",
      }),
      softFlowClient.get<Product[]>("/api/auxiliar/produtos"),
    ]);

    this.users = users ?? [];
    this.products = (products ?? []).filter((p) => p.desativado !== "1");
    this.dataFetchedAt = now;
  }

  private mapProductId(id: string | null | undefined): Product | undefined {
    if (!id) return undefined;
    return this.products.find((p) => p.id === id);
  }

  private mapUserIds(ids: string[] | undefined): User[] {
    if (!ids || ids.length === 0) return [];
    return this.users.filter((u) => ids.includes(u.id));
  }

  private mimeToAudioFormat(mimeType: string): "mp3" | "wav" {
    const normalized = mimeType.toLowerCase();
    if (normalized.includes("wav")) return "wav";
    return "mp3";
  }

  private isAudioRelatedError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes("audio") ||
      message.includes("429") ||
      message.includes("input_audio") ||
      message.includes("unsupported") ||
      message.includes("modalit")
    );
  }

  private extractTextContent(content: string | null | undefined): string {
    return content?.trim() || "";
  }

  /**
   * Modelos recentes da OpenAI (ex.: gpt-5.4-nano) exigem max_completion_tokens
   * em vez de max_tokens.
   */
  private usesMaxCompletionTokens(): boolean {
    const model = this.modelName.toLowerCase();
    return (
      model.startsWith("gpt-5") ||
      model.startsWith("o1") ||
      model.startsWith("o3") ||
      model.startsWith("o4")
    );
  }

  private buildTokenLimit(maxTokens: number | undefined): {
    max_tokens?: number;
    max_completion_tokens?: number;
  } {
    const limit = maxTokens ?? this.generationConfig.maxTokens;
    if (limit === undefined) return {};

    return this.usesMaxCompletionTokens()
      ? { max_completion_tokens: limit }
      : { max_tokens: limit };
  }

  /**
   * Chamada central ao chat completions (OpenAI-compatible).
   */
  private async chat(options: {
    messages: OpenAI.ChatCompletionMessageParam[];
    jsonMode?: boolean;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.modelName,
      messages: options.messages,
      stream: false,
      temperature: options.temperature ?? this.generationConfig.temperature,
      ...this.buildTokenLimit(options.maxTokens),
      ...(options.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });

    return this.extractTextContent(response.choices[0]?.message?.content);
  }

  /**
   * Gera resposta JSON a partir de um prompt (usado por ProductionAnalysisService).
   */
  async generateJSON(
    prompt: string,
    config?: Partial<GenerationOptions>,
  ): Promise<string> {
    return this.chat({
      messages: [{ role: "user", content: prompt }],
      jsonMode: true,
      temperature: config?.temperature ?? 0.1,
      maxTokens: config?.maxTokens ?? 4096,
    });
  }

  private validateContent(content: string): {
    isValid: boolean;
    error?: string;
  } {
    const trimmed = content.trim();

    if (trimmed.length < 20) {
      return {
        isValid: false,
        error:
          "O conteúdo fornecido é muito curto. Por favor, forneça uma descrição mais detalhada do bug, melhoria ou requisito.",
      };
    }

    const invalidPatterns = [
      /^teste$/i,
      /^test$/i,
      /^testando$/i,
      /^teste teste$/i,
      /^123$/i,
      /^abc$/i,
      /^lorem ipsum/i,
      /^placeholder$/i,
    ];

    if (invalidPatterns.some((pattern) => pattern.test(trimmed))) {
      return {
        isValid: false,
        error:
          "O conteúdo fornecido não contém informações suficientes sobre um bug, melhoria ou requisito. Por favor, forneça uma descrição mais detalhada.",
      };
    }

    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 3) {
      return {
        isValid: false,
        error:
          "O conteúdo fornecido é muito curto. Por favor, forneça uma descrição mais detalhada com pelo menos algumas palavras.",
      };
    }

    return { isValid: true };
  }

  async processReport(request: AssistantRequest): Promise<AssistantResponse> {
    const startTime = Date.now();

    try {
      await this.ensureDataLoaded();

      const hasDescription =
        request.description && request.description.trim().length > 0;
      const hasAudio = request.audio && request.audio.length > 0;

      if (!hasDescription && !hasAudio) {
        return {
          success: false,
          error:
            "É necessário fornecer pelo menos uma descrição (texto) ou um arquivo de áudio",
        };
      }

      if (hasDescription && request.description) {
        const contentValidation = this.validateContent(request.description);
        if (!contentValidation.isValid) {
          return {
            success: false,
            error: contentValidation.error || "Conteúdo inválido",
          };
        }
      }

      const template = await promptRepository.resolve(request.squadSetor);
      const prompt = buildFormAssistantPrompt(template, this.products, this.users);
      const contentParts: ChatContentPart[] = [{ type: "text", text: prompt }];

      if (hasDescription) {
        contentParts.push({
          type: "text",
          text: `\n\nDescrição fornecida:\n${request.description}`,
        });
      }

      if (hasAudio && request.audioMimeType) {
        const audioBase64 = request.audio?.toString("base64") || "";
        contentParts.push({
          type: "input_audio",
          input_audio: {
            data: audioBase64,
            format: this.mimeToAudioFormat(request.audioMimeType),
          },
        });

        if (!hasDescription) {
          contentParts.push({
            type: "text",
            text: '\n\nIMPORTANTE: Transcreva o áudio fornecido e processe as informações conforme o prompt acima. Analise o áudio transcrito para identificar o produto e usuários mencionados. Se o áudio estiver vazio, sem fala, ou contiver apenas ruído/silêncio, você DEVE retornar um JSON com todos os campos preenchidos com "Não informado" e a categoria como "BUG". Não invente informações se o áudio não contiver conteúdo útil.',
          });
        } else {
          contentParts.push({
            type: "text",
            text: "\n\nConsidere também o áudio fornecido para complementar a descrição em texto. Analise o áudio transcrito para identificar o produto e usuários mencionados. Se o áudio estiver vazio ou sem conteúdo útil, use apenas a descrição em texto fornecida.",
          });
        }
      }

      contentParts.push({
        type: "text",
        text: "\n\nRetorne APENAS o JSON válido:",
      });

      let text: string;
      try {
        text = await this.chat({
          messages: [{ role: "user", content: contentParts }],
          jsonMode: true,
        });
      } catch (error) {
        if (hasAudio && this.isAudioRelatedError(error)) {
          return {
            success: false,
            error: AUDIO_ERROR_MESSAGE,
            processedIn: `${Date.now() - startTime}ms`,
          };
        }
        throw error;
      }

      let parsedData: AssistantDataFromAI;
      try {
        parsedData = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Resposta da IA não contém JSON válido");
        }
      }

      if (
        !parsedData.title ||
        !parsedData.description ||
        !parsedData.category
      ) {
        return {
          success: false,
          error: "Resposta da IA está incompleta",
        };
      }

      const categoriaUpper = parsedData.category.toUpperCase();
      if (!["BUG", "MELHORIA", "REQUISITO"].includes(categoriaUpper)) {
        parsedData.category = "BUG";
      } else {
        parsedData.category = categoriaUpper as
          | "BUG"
          | "MELHORIA"
          | "REQUISITO";
      }

      const aiProduct = this.mapProductId(parsedData.productId);
      const matchedUsers = this.mapUserIds(parsedData.userIds);
      const contentForMatching = request.description?.trim() ?? "";
      const resolvedProduct = resolveProductMatch(
        contentForMatching,
        aiProduct,
        this.products,
      );

      let title = parsedData.title;
      if (resolvedProduct) {
        title = fixTitleProductPrefix(title, resolvedProduct);
      }

      const finalData: AssistantData = {
        title,
        description: parsedData.description,
        category: parsedData.category,
        additionalInformation: parsedData.additionalInformation,
      };

      if (resolvedProduct) {
        finalData.product = resolvedProduct;
      }

      if (matchedUsers.length > 0) {
        finalData.users = matchedUsers;
      }

      return {
        success: true,
        data: finalData,
        confidence: 0.95,
        processedIn: `${Date.now() - startTime}ms`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erro ao processar relatório com IA",
        processedIn: `${Date.now() - startTime}ms`,
      };
    }
  }

  async processReportAnalysis(
    request: ReportAnalysisRequest,
  ): Promise<ReportAnalysisResponse> {
    const startTime = Date.now();

    try {
      const hasReport = request.report && request.report.trim().length > 0;
      const hasDescription =
        request.description && request.description.trim().length > 0;
      const hasAudio = request.audio && request.audio.length > 0;

      if (!hasReport) {
        return {
          success: false,
          error:
            "É necessário fornecer o campo report (texto) com a solicitação do suporte",
        };
      }

      if (!hasDescription && !hasAudio) {
        return {
          success: false,
          error:
            "É necessário fornecer pelo menos uma descrição (texto) ou um arquivo de áudio",
        };
      }

      const reportValidation = this.validateContent(request.report);
      if (!reportValidation.isValid) {
        return {
          success: false,
          error: reportValidation.error || "Conteúdo inválido",
        };
      }

      if (hasDescription && request.description) {
        const contentValidation = this.validateContent(request.description);
        if (!contentValidation.isValid) {
          return {
            success: false,
            error: contentValidation.error || "Conteúdo inválido",
          };
        }
      }

      const contentParts: ChatContentPart[] = [
        { type: "text", text: REPORT_ANALYSIS_PROMPT },
        {
          type: "text",
          text:
            `\n\nMensagem recebida do suporte (report):\n\n` +
            `${request.report}\n\n` +
            `Com base no texto acima, gere a resposta melhorada no estilo WhatsApp corporativo, aplicando sua análise de viabilidade, tradução da dor e direcionamento quando necessário.`,
        },
      ];

      if (hasDescription) {
        contentParts.push({
          type: "text",
          text: `\n\nContexto adicional do time de desenvolvimento (description):\n${request.description}`,
        });
      }

      if (hasAudio && request.audioMimeType) {
        const audioBase64 = request.audio?.toString("base64") || "";
        contentParts.push({
          type: "input_audio",
          input_audio: {
            data: audioBase64,
            format: this.mimeToAudioFormat(request.audioMimeType),
          },
        });

        if (!hasDescription) {
          contentParts.push({
            type: "text",
            text: "\n\nIMPORTANTE: Transcreva o áudio fornecido e use a transcrição como contexto adicional do time de desenvolvimento (description) para complementar o report acima. Se o áudio estiver vazio, sem fala, ou contiver apenas ruído/silêncio, siga apenas com o report e inclua perguntas objetivas para esclarecer o que estiver faltando.",
          });
        } else {
          contentParts.push({
            type: "text",
            text: "\n\nConsidere também o áudio fornecido para complementar o contexto adicional do time de desenvolvimento (description). Se o áudio estiver vazio ou sem conteúdo útil, use apenas os textos fornecidos.",
          });
        }
      }

      let responseText: string;
      try {
        responseText = await this.chat({
          messages: [{ role: "user", content: contentParts }],
        });
      } catch (error) {
        if (hasAudio && this.isAudioRelatedError(error)) {
          return {
            success: false,
            error: AUDIO_ERROR_MESSAGE,
            processedIn: `${Date.now() - startTime}ms`,
          };
        }
        throw error;
      }

      if (!responseText) {
        return {
          success: false,
          error: "Resposta da IA está vazia",
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      return {
        success: true,
        data: { analysis: responseText },
        confidence: 0.95,
        processedIn: `${Date.now() - startTime}ms`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erro ao processar análise de report com IA",
        processedIn: `${Date.now() - startTime}ms`,
      };
    }
  }

  getModelName(): string {
    return this.modelName;
  }
}
