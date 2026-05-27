import {
  ProductionRecord,
  ProductionConfig,
  UserPreProcessedMetrics,
  GapInfo,
  OverlapInfo,
  StatusColaborador,
} from '../types/production-analysis.js';

/**
 * Converte string de hora no formato "HH:MM:SS.0000000" para minutos desde meia-noite.
 * Segundos são desconsiderados — sobreposições de apenas segundos não são tratadas como inconsistência.
 */
function horaParaMinutos(hora: string): number {
  const partes = hora.split(':');
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);
  return h * 60 + m;
}

/**
 * Formata minutos desde meia-noite para "HH:MM".
 */
function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formata total de minutos para exibição "Xh Ym".
 */
function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Pré-processa registros de produção de forma algorítmica.
 * Calcula totais, detecta sobreposições, gaps, produções viradas e
 * sugere um status preliminar antes de enviar para a IA.
 */
export class ProductionPreProcessor {
  process(
    records: ProductionRecord[],
    config: ProductionConfig,
  ): UserPreProcessedMetrics[] {
    // Agrupa registros por colaborador + data
    const grupos = new Map<string, ProductionRecord[]>();

    for (const rec of records) {
      const chave = `${rec.nome_suporte}|${rec.data_producao}`;
      const lista = grupos.get(chave) ?? [];
      lista.push(rec);
      grupos.set(chave, lista);
    }

    const resultado: UserPreProcessedMetrics[] = [];

    for (const [chave, recs] of grupos) {
      const [nomeSuporte, dataProducao] = chave.split('|');

      // Ordena por hora de abertura
      const ordenados = [...recs].sort(
        (a, b) => horaParaMinutos(a.hora_abertura) - horaParaMinutos(b.hora_abertura),
      );

      const totalMinutos = ordenados.reduce(
        (acc, r) => acc + Number(r.realizado_minutos),
        0,
      );
      const minutosTecnicos = ordenados
        .filter(r => r.tarefa_tecnica)
        .reduce((acc, r) => acc + Number(r.realizado_minutos), 0);
      const minutosNaoTecnicos = totalMinutos - minutosTecnicos;

      const horaInicio = ordenados[0].hora_abertura;
      const horaFim = ordenados[ordenados.length - 1].hora_fechamento;

      const sobreposicoes = this.detectarSobreposicoes(ordenados);
      const gaps = this.detectarGaps(ordenados, config);
      const producoes_viradas = this.detectarProducoesViradas(ordenados, config);
      const almoco_detectado = this.detectarAlmoco(gaps);

      const status_sugerido = this.sugerirStatus(
        totalMinutos,
        sobreposicoes,
        gaps,
        producoes_viradas,
        almoco_detectado,
        config,
      );

      resultado.push({
        nome_suporte: nomeSuporte,
        data_producao: dataProducao,
        total_minutos: totalMinutos,
        minutos_tecnicos: minutosTecnicos,
        minutos_nao_tecnicos: minutosNaoTecnicos,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        gaps,
        sobreposicoes,
        producoes_viradas,
        almoco_detectado,
        status_sugerido,
      });
    }

    return resultado;
  }

  /**
   * Detecta sobreposições: tarefa B inicia antes de tarefa A terminar.
   */
  private detectarSobreposicoes(records: ProductionRecord[]): OverlapInfo[] {
    const sobreposicoes: OverlapInfo[] = [];

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const a = records[i];
        const b = records[j];

        const aInicio = horaParaMinutos(a.hora_abertura);
        const aFim = horaParaMinutos(a.hora_fechamento);
        const bInicio = horaParaMinutos(b.hora_abertura);
        const bFim = horaParaMinutos(b.hora_fechamento);

        // Ignora produções viradas na detecção de sobreposição
        if (aFim < aInicio || bFim < bInicio) continue;

        const inicioConflito = Math.max(aInicio, bInicio);
        const fimConflito = Math.min(aFim, bFim);
        const duracaoConflito = fimConflito - inicioConflito;

        if (duracaoConflito > 0) {
          sobreposicoes.push({
            registro_a: a.registro,
            registro_b: b.registro,
            descricao_a: a.descricao_resumo,
            descricao_b: b.descricao_resumo,
            intervalo_conflito: `${minutosParaHora(inicioConflito)}–${minutosParaHora(fimConflito)}`,
            duracao_minutos: duracaoConflito,
          });
        }
      }
    }

    return sobreposicoes;
  }

  /**
   * Detecta gaps entre registros consecutivos dentro da janela comercial.
   */
  private detectarGaps(
    records: ProductionRecord[],
    config: ProductionConfig,
  ): GapInfo[] {
    const gaps: GapInfo[] = [];

    const janelaInicio = horaParaMinutos(config.janela_inicio);
    const janelaFim = horaParaMinutos(config.janela_fim);

    for (let i = 0; i < records.length - 1; i++) {
      const atual = records[i];
      const proximo = records[i + 1];

      const fimAtual = horaParaMinutos(atual.hora_fechamento);
      const inicioProximo = horaParaMinutos(proximo.hora_abertura);

      // Ignora se algum dos registros está fora da janela comercial
      if (fimAtual < janelaInicio || inicioProximo > janelaFim) continue;

      const duracao = inicioProximo - fimAtual;

      if (duracao > 0) {
        gaps.push({
          hora_inicio: minutosParaHora(fimAtual),
          hora_fim: minutosParaHora(inicioProximo),
          duracao_minutos: duracao,
        });
      }
    }

    return gaps;
  }

  /**
   * Detecta registros com duração excessiva ou que cruzam meia-noite.
   */
  private detectarProducoesViradas(
    records: ProductionRecord[],
    config: ProductionConfig,
  ): string[] {
    const viradas: string[] = [];

    for (const rec of records) {
      const inicio = horaParaMinutos(rec.hora_abertura);
      const fim = horaParaMinutos(rec.hora_fechamento);
      const duracaoReal = Number(rec.realizado_minutos);

      const cruzouMeiaNoite = fim < inicio;
      const duracaoExcessiva = duracaoReal > config.limite_producao_virada_minutos;

      if (cruzouMeiaNoite || duracaoExcessiva) {
        viradas.push(rec.registro);
      }
    }

    return viradas;
  }

  /**
   * Identifica o maior gap no período de almoço (11:00–14:30).
   */
  private detectarAlmoco(gaps: GapInfo[]): GapInfo | null {
    const almocoInicio = horaParaMinutos('11:00');
    const almocoFim = horaParaMinutos('14:30');

    const gapsAlmoco = gaps.filter(g => {
      const inicio = horaParaMinutos(g.hora_inicio);
      const fim = horaParaMinutos(g.hora_fim);
      return inicio >= almocoInicio && fim <= almocoFim;
    });

    if (gapsAlmoco.length === 0) return null;

    return gapsAlmoco.reduce((maior, g) =>
      g.duracao_minutos > maior.duracao_minutos ? g : maior,
    );
  }

  /**
   * Sugere um status preliminar com base nas métricas calculadas.
   */
  private sugerirStatus(
    totalMinutos: number,
    sobreposicoes: OverlapInfo[],
    gaps: GapInfo[],
    producoes_viradas: string[],
    almoco_detectado: GapInfo | null,
    config: ProductionConfig,
  ): StatusColaborador {
    if (sobreposicoes.length > 0 || producoes_viradas.length > 0) {
      return 'INCONSISTENCIA';
    }

    const limiarCritico = Math.floor(config.meta_minutos * 0.75);
    const limiarLeve = Math.floor(config.meta_minutos * 0.875);
    const limiteAlmocoTotal = config.limite_almoco_minutos + config.tolerancia_almoco_minutos;

    const temApagao = gaps.some(g => g.duracao_minutos >= config.limite_apagao_minutos);
    const temAlmocoLongo = almoco_detectado !== null && almoco_detectado.duracao_minutos > limiteAlmocoTotal;

    if (totalMinutos < limiarCritico || temApagao) {
      return 'ALERTA_CRITICO';
    }

    if (totalMinutos < limiarLeve || temAlmocoLongo) {
      return 'ALERTA_LEVE';
    }

    return 'CONFORME';
  }

  /**
   * Serializa as métricas para injeção no prompt da IA.
   */
  serializarMetricas(metricas: UserPreProcessedMetrics[]): string {
    return JSON.stringify(
      metricas.map(m => ({
        nome_suporte: m.nome_suporte,
        data_producao: m.data_producao,
        total_minutos: m.total_minutos,
        total_formatado: formatarDuracao(m.total_minutos),
        minutos_tecnicos: m.minutos_tecnicos,
        minutos_nao_tecnicos: m.minutos_nao_tecnicos,
        hora_inicio: m.hora_inicio,
        hora_fim: m.hora_fim,
        gaps_detectados: m.gaps,
        sobreposicoes_detectadas: m.sobreposicoes,
        producoes_viradas: m.producoes_viradas,
        almoco_detectado: m.almoco_detectado,
        status_sugerido: m.status_sugerido,
      })),
      null,
      2,
    );
  }
}
