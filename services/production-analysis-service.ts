import { GenerativeModel } from "@google/generative-ai";
import {
  ProductionRecord,
  ProductionConfig,
  DEFAULT_PRODUCTION_CONFIG,
  ProductionAnalysisRequest,
  ProductionAnalysisResponse,
  ColaboradorAnalysis,
  SquadSummary,
  StatusColaborador,
  AIProductionAnalysisResponse,
  SoftFlowApiResponse,
} from "../types/production-analysis.js";
import { ProductionPreProcessor } from "./production-preprocessor.js";
import { buildProductionAnalysisPrompt } from "../prompts/production-analysis.js";
import { softFlowClient } from "./softflow-client.js";

const preprocessor = new ProductionPreProcessor();

/**
 * Orquestra o fluxo completo de análise de produção:
 * API externa → pré-processamento → IA (Gemini) → resposta estruturada
 */
export class ProductionAnalysisService {
  private model: GenerativeModel;

  constructor(model: GenerativeModel) {
    this.model = model;
  }

  async analyze(
    request: ProductionAnalysisRequest,
  ): Promise<ProductionAnalysisResponse> {
    const startTime = Date.now();

    try {
      const config = this.resolverConfig(request.configuracao);

      // 1. Buscar dados na API externa
      const records = await this.buscarDadosExternos(request);

      if (records.length === 0) {
        return {
          success: false,
          error:
            "Nenhum registro de produção encontrado para os filtros informados.",
          processedIn: `${Date.now() - startTime}ms`,
        };
      }

      // 2. Pré-processar algoritmicamente
      const metricas = preprocessor.process(records, config);
      const metricasSerializadas = preprocessor.serializarMetricas(metricas);
      const registrosSerializados = JSON.stringify(records, null, 2);

      // 3. Montar prompt e chamar a IA
      const prompt = buildProductionAnalysisPrompt(
        config,
        metricasSerializadas,
        registrosSerializados,
      );

      const resultado = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const textoResposta = resultado.response.text();

      let aiResponse: AIProductionAnalysisResponse;
      try {
        aiResponse = JSON.parse(textoResposta);
      } catch {
        const match = textoResposta.match(/\{[\s\S]*\}/);
        if (match) {
          aiResponse = JSON.parse(match[0]);
        } else {
          throw new Error("Resposta da IA não contém JSON válido");
        }
      }

      if (
        !aiResponse?.colaboradores ||
        !Array.isArray(aiResponse.colaboradores)
      ) {
        throw new Error("Estrutura da resposta da IA está incompleta");
      }

      // 4. Transformar inconsistencias: objeto[] → string[]
      const colaboradores: ColaboradorAnalysis[] = aiResponse.colaboradores.map(
        (col) => ({
          nome_suporte: col.nome_suporte,
          data_producao: col.data_producao,
          status: this.validarStatus(col.status),
          motivo_status: col.motivo_status,
          total_horas: col.total_horas,
          janela_trabalho: col.janela_trabalho,
          horas_tecnicas: col.horas_tecnicas,
          horas_nao_tecnicas: col.horas_nao_tecnicas,
          percentual_tecnico: col.percentual_tecnico,
          percentual_nao_tecnico: col.percentual_nao_tecnico,
          inconsistencias: (col.inconsistencias ?? []).map((i) => i.descricao),
        }),
      );

      // 5. Calcular resumo_squad algoritmicamente (nunca delegado à IA)
      const resumo_squad = this.calcularResumoSquad(colaboradores);

      return {
        success: true,
        data: { resumo_squad, colaboradores },
        processedIn: `${Date.now() - startTime}ms`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Erro ao processar análise de produção",
        processedIn: `${Date.now() - startTime}ms`,
      };
    }
  }

  /**
   * Consulta a API SoftFlow para obter os registros de produção.
   * Utiliza o softFlowClient que gerencia autenticação dinamicamente.
   */
  private async buscarDadosExternos(
    request: ProductionAnalysisRequest,
  ): Promise<ProductionRecord[]> {
    const params: Record<string, string> = {
      data_producao_inicio: request.data_producao_inicio,
      data_producao_fim: request.data_producao_fim,
      tipo: "CASOS",
    };

    if (request.projeto_id) params.projeto_id = request.projeto_id;
    if (request.usuario) params.usuario = request.usuario;

    const response = await softFlowClient.get<SoftFlowApiResponse>(
      "/api/producao-horas-analiticas",
      params,
    );

    if (!response?.success || !Array.isArray(response?.data)) {
      throw new Error("Resposta inválida da API externa SoftFlow");
    }

    return response.data;
  }

  /**
   * Mescla o config recebido com os defaults, aplicando apenas os campos fornecidos.
   */
  private resolverConfig(
    parcial?: Partial<ProductionConfig>,
  ): ProductionConfig {
    if (!parcial) return { ...DEFAULT_PRODUCTION_CONFIG };
    return { ...DEFAULT_PRODUCTION_CONFIG, ...parcial };
  }

  /**
   * Garante que o status retornado pela IA é um valor válido.
   */
  private validarStatus(status: string): StatusColaborador {
    const validos: StatusColaborador[] = [
      "CONFORME",
      "ALERTA_LEVE",
      "ALERTA_CRITICO",
      "INCONSISTENCIA",
    ];
    return validos.includes(status as StatusColaborador)
      ? (status as StatusColaborador)
      : "ALERTA_CRITICO";
  }

  /**
   * Calcula o resumo do squad com base na lista final de colaboradores.
   */
  private calcularResumoSquad(
    colaboradores: ColaboradorAnalysis[],
  ): SquadSummary {
    const total = colaboradores.length;

    const contagem: Record<StatusColaborador, number> = {
      CONFORME: 0,
      ALERTA_LEVE: 0,
      ALERTA_CRITICO: 0,
      INCONSISTENCIA: 0,
    };

    for (const col of colaboradores) {
      contagem[col.status]++;
    }

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      total_colaboradores: total,
      conforme: {
        count: contagem.CONFORME,
        percentual: pct(contagem.CONFORME),
      },
      alerta_leve: {
        count: contagem.ALERTA_LEVE,
        percentual: pct(contagem.ALERTA_LEVE),
      },
      alerta_critico: {
        count: contagem.ALERTA_CRITICO,
        percentual: pct(contagem.ALERTA_CRITICO),
      },
      inconsistencia: {
        count: contagem.INCONSISTENCIA,
        percentual: pct(contagem.INCONSISTENCIA),
      },
    };
  }
}
