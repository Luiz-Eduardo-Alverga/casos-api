/**
 * Tipos para o endpoint de geração do Registro de Liberação via IA.
 */

/** Item bruto retornado por GET /api/sprint/liberacoes/{liberacaoId}/itens (API Softflow). */
export interface SoftFlowLiberacaoItem {
  caso_id: number;
  datas: string;
  prioridade: number;
  nome_produto: string;
  versao: string;
  descricao_resumo: string;
  modulo: string | null;
  faq: unknown;
  tempo_estimado: unknown;
  estado_id: number;
  estado: string;
  resolucao_id: number;
  resolucao: string;
  colaborador_id: number;
  cronograma_id: number;
  status_tempo: string;
  passos_para_reproduzir: string | null;
  /** true = item confirmado como parte desta liberação. Não é usado para filtrar a análise da IA (todos os itens são considerados). */
  liberacao: boolean;
  produto_id: number;
}

export interface SoftFlowLiberacaoItensResponse {
  data: SoftFlowLiberacaoItem[];
  total: number;
  /** Offset da próxima página; null indica que não há mais páginas. */
  next_offset: number | null;
  filtro: Record<string, unknown>;
}

/** Dado curado (apenas os campos usados na geração do documento) enviado à IA. */
export interface ReleaseNotesTicket {
  casoId: number;
  produto: string;
  versao: string;
  modulo: string | null;
  descricaoResumo: string;
  /**
   * Texto adicional do Softflow. Quando preenchido, pode conter rascunho
   * estruturado de release notes — deve ser priorizado pela IA.
   */
  passosParaReproduzir: string | null;
}

export interface ReleaseNotesRequest {
  liberacaoId: string;
  /** Id de um prompt cadastrado do tipo RELEASE_NOTES. Sem ele, usa o prompt DEFAULT do tipo. */
  promptId?: string;
}

export interface ReleaseNotesData {
  registro_liberacao: string;
  produto: string;
  versoes: string[];
  total_casos: number;
}

export interface ReleaseNotesResponse {
  success: boolean;
  data?: ReleaseNotesData;
  processedIn?: string;
  error?: string;
}

/** Total de etapas reais do fluxo (espelha o ReleaseNotesService). */
export const RELEASE_NOTES_TOTAL_STEPS = 5 as const;

/**
 * Etapas honestas do pipeline — o front deve usar esses valores,
 * sem inventar passos intermediários da IA.
 */
export type ReleaseNotesProgressStepId =
  | "fetch_softflow"
  | "extract_tickets"
  | "resolve_prompt"
  | "generate_ai"
  | "finalize";

export interface ReleaseNotesProgressEvent {
  step: number;
  totalSteps: typeof RELEASE_NOTES_TOTAL_STEPS;
  stepId: ReleaseNotesProgressStepId;
  /** 0–100, aproximado por etapa (não é % real da OpenAI). */
  percent: number;
  title: string;
  detail: string;
  totalCasos?: number;
}

export type ReleaseNotesProgressCallback = (
  event: ReleaseNotesProgressEvent,
) => void;

/** Chunk de Markdown emitido durante a etapa generate_ai (SSE `delta`). */
export interface ReleaseNotesDeltaEvent {
  /** Trecho incremental — o client deve concatenar. */
  chunk: string;
}

export type ReleaseNotesDeltaCallback = (
  event: ReleaseNotesDeltaEvent,
) => void;

/** Opções opcionais do fluxo analyze (progresso SSE, streaming da IA, abort). */
export interface ReleaseNotesAnalyzeOptions {
  onProgress?: ReleaseNotesProgressCallback;
  onDelta?: ReleaseNotesDeltaCallback;
  signal?: AbortSignal;
}
