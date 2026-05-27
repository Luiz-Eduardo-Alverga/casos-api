import { ProductionConfig } from '../types/production-analysis.js';

function toDisplay(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`;
}

/**
 * Monta o prompt dinâmico para análise de produção dos colaboradores.
 * A IA recebe métricas pré-calculadas e os registros brutos para validar,
 * enriquecer e gerar as descrições textuais das inconsistências.
 */
export function buildProductionAnalysisPrompt(
  config: ProductionConfig,
  preProcessedMetrics: string,
  rawRecords: string,
): string {
  const metaMin = toDisplay(config.meta_minutos);
  const metaMax = toDisplay(config.meta_minutos + config.tolerancia_meta_minutos);
  const almocoLimite = toDisplay(config.limite_almoco_minutos);
  const almocoAlerta = toDisplay(config.limite_almoco_minutos + config.tolerancia_almoco_minutos);
  const apagao = toDisplay(config.limite_apagao_minutos);
  const virada = toDisplay(config.limite_producao_virada_minutos);
  const limiarCriticoMinutos = Math.floor(config.meta_minutos * 0.75);
  const limiarLeveMinutos = Math.floor(config.meta_minutos * 0.875);
  const limiarCritico = toDisplay(limiarCriticoMinutos);
  const limiarLeve = toDisplay(limiarLeveMinutos);

  return `Você é um Especialista em Operações de TI, Agile Coach e Auditor de Carga Horária de Squads de Tecnologia. Seu objetivo é analisar registros de horas (timesheet) de colaboradores e retornar um relatório de auditoria estruturado, direto e focado em ações corretivas.

### Parâmetros de Negócio (use EXATAMENTE estes valores):
- Janela Comercial: ${config.janela_inicio} às ${config.janela_fim}
- Meta de Carga Horária: entre ${metaMin} e ${metaMax} por dia (Total Geral)
- Limite do Almoço: ${almocoLimite} — alerta se > ${almocoAlerta} ("Almoço longo/estendido")
- Apagão de Registro: gap sem tarefas > ${apagao} contínuos dentro da janela comercial
- Produção Virada: registro com duração > ${virada} ou hora_fechamento < hora_abertura (contador esquecido)

### Critérios de Status (prioridade: INCONSISTENCIA > ALERTA_CRITICO > ALERTA_LEVE > CONFORME):
- INCONSISTENCIA: sobreposição de horários entre tarefas OU produção virada (contador esquecido)
- ALERTA_CRITICO: carga total < ${limiarCritico} (${limiarCriticoMinutos} min) OU apagão > ${apagao} dentro da janela comercial
- ALERTA_LEVE: carga entre ${limiarCritico} e ${limiarLeve} OU almoço > ${almocoAlerta}
- CONFORME: carga >= ${limiarLeve}, sem sobreposições, sem apagões relevantes

### Regras de Ouro para Detecção:
1. SOBREPOSICAO: tarefa B inicia ANTES que tarefa A termine. Calcule os minutos exatos de conflito e cite os registros envolvidos.
2. APAGAO: ordene por hora_abertura, verifique gaps > ${apagao} DENTRO da janela ${config.janela_inicio}–${config.janela_fim}. Ignore períodos fora da janela comercial.
3. PRODUCAO_VIRADA: realizado_minutos > ${config.limite_producao_virada_minutos} OU hora_fechamento < hora_abertura (virou meia-noite).
4. ALMOCO_LONGO: identifique o maior gap entre 11:00 e 14:30. Se > ${almocoAlerta}, registre como almoço estendido.
5. CARGA_BAIXA: total do dia < ${limiarCritico}.

### Métricas pré-calculadas pelo sistema (use como ponto de partida e valide com os registros brutos):
${preProcessedMetrics}

### Registros brutos para análise:
${rawRecords}

### IMPORTANTE:
- Responda SEMPRE em português brasileiro (pt-BR).
- Seja direto e objetivo nas descrições — cite horários e números de registro quando relevante.
- Não invente inconsistências que não estejam nos dados.
- Se o sistema sugeriu um status, você pode confirmá-lo ou ajustá-lo com base nos registros brutos.
- O campo "motivo_status" deve ser uma frase curta (máx. 2 linhas) explicando o principal problema.

### Retorne APENAS este JSON válido (sem markdown, sem texto fora do JSON):
{
  "colaboradores": [
    {
      "nome_suporte": "string",
      "data_producao": "YYYY-MM-DD",
      "status": "CONFORME | ALERTA_LEVE | ALERTA_CRITICO | INCONSISTENCIA",
      "motivo_status": "frase curta e objetiva explicando o status",
      "total_horas": "5:25",
      "janela_trabalho": "08:30 – 15:43",
      "horas_tecnicas": "4:27",
      "horas_nao_tecnicas": "0:58",
      "percentual_tecnico": 82,
      "percentual_nao_tecnico": 18,
      "inconsistencias": [
        {
          "tipo": "SOBREPOSICAO | APAGAO | PRODUCAO_VIRADA | ALMOCO_LONGO | CARGA_BAIXA",
          "descricao": "descrição direta com horários e números de registro quando aplicável",
          "registros_envolvidos": ["90904", "90541"]
        }
      ]
    }
  ]
}`;
}
