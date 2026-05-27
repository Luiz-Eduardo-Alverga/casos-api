/**
 * Tipos para o endpoint de análise de produção dos colaboradores
 */

export interface ProductionRecord {
  registro: string;
  sequencia: string;
  descricao_resumo: string;
  nome_suporte: string;
  hora_abertura: string;
  hora_fechamento: string;
  realizado_minutos: string;
  tipo: string;
  tarefa_tecnica: boolean;
  produto: string;
  versao_produto: string;
  data_producao: string;
}

export interface SoftFlowApiResponse {
  success: boolean;
  data: ProductionRecord[];
  total: number;
}

export interface ProductionConfig {
  meta_minutos: number;
  tolerancia_meta_minutos: number;
  janela_inicio: string;
  janela_fim: string;
  limite_almoco_minutos: number;
  tolerancia_almoco_minutos: number;
  limite_apagao_minutos: number;
  limite_producao_virada_minutos: number;
}

export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  meta_minutos: 480,
  tolerancia_meta_minutos: 48,
  janela_inicio: '08:00',
  janela_fim: '18:00',
  limite_almoco_minutos: 72,
  tolerancia_almoco_minutos: 13,
  limite_apagao_minutos: 120,
  limite_producao_virada_minutos: 600,
};

export interface GapInfo {
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
}

export interface OverlapInfo {
  registro_a: string;
  registro_b: string;
  descricao_a: string;
  descricao_b: string;
  intervalo_conflito: string;
  duracao_minutos: number;
}

export interface UserPreProcessedMetrics {
  nome_suporte: string;
  data_producao: string;
  total_minutos: number;
  minutos_tecnicos: number;
  minutos_nao_tecnicos: number;
  hora_inicio: string;
  hora_fim: string;
  gaps: GapInfo[];
  sobreposicoes: OverlapInfo[];
  producoes_viradas: string[];
  almoco_detectado: GapInfo | null;
  status_sugerido: StatusColaborador;
}

export type StatusColaborador =
  | 'CONFORME'
  | 'ALERTA_LEVE'
  | 'ALERTA_CRITICO'
  | 'INCONSISTENCIA';

export interface InconsistenciaDetalhe {
  tipo:
    | 'SOBREPOSICAO'
    | 'APAGAO'
    | 'PRODUCAO_VIRADA'
    | 'ALMOCO_LONGO'
    | 'CARGA_BAIXA';
  descricao: string;
  registros_envolvidos: string[];
}

export interface ColaboradorAnalysis {
  nome_suporte: string;
  data_producao: string;
  status: StatusColaborador;
  motivo_status: string;
  total_horas: string;
  janela_trabalho: string;
  horas_tecnicas: string;
  horas_nao_tecnicas: string;
  percentual_tecnico: number;
  percentual_nao_tecnico: number;
  inconsistencias: string[];
}

export interface SquadSummary {
  total_colaboradores: number;
  conforme: { count: number; percentual: number };
  alerta_leve: { count: number; percentual: number };
  alerta_critico: { count: number; percentual: number };
  inconsistencia: { count: number; percentual: number };
}

export interface ProductionAnalysisQueryParams {
  data_producao_inicio: string;
  data_producao_fim: string;
  projeto_id?: string;
  usuario?: string;
}

export interface ProductionAnalysisRequest extends ProductionAnalysisQueryParams {
  configuracao?: Partial<ProductionConfig>;
}

export interface ProductionAnalysisResponse {
  success: boolean;
  data?: {
    resumo_squad: SquadSummary;
    colaboradores: ColaboradorAnalysis[];
  };
  processedIn?: string;
  error?: string;
}

export interface AIColaboradorAnalysis {
  nome_suporte: string;
  data_producao: string;
  status: StatusColaborador;
  motivo_status: string;
  total_horas: string;
  janela_trabalho: string;
  horas_tecnicas: string;
  horas_nao_tecnicas: string;
  percentual_tecnico: number;
  percentual_nao_tecnico: number;
  inconsistencias: InconsistenciaDetalhe[];
}

export interface AIProductionAnalysisResponse {
  colaboradores: AIColaboradorAnalysis[];
}

export interface SingleColaboradorResponse {
  success: boolean;
  data?: ColaboradorAnalysis;
  processedIn?: string;
  error?: string;
}
