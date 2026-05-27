/**
 * Schemas JSON para documentação Swagger do endpoint /api/production-analysis
 */

/**
 * Schema de validação — usado pelo AJV do Fastify (sem "example", que quebra o strict mode).
 * Inclui "description" que é válido no JSON Schema e enriquece o Swagger UI.
 */
export const productionAnalysisQueryParamsSchema = {
  type: 'object',
  properties: {
    data_producao_inicio: {
      type: 'string',
      description: 'Data de início do período (YYYY-MM-DD). Obrigatório.',
    },
    data_producao_fim: {
      type: 'string',
      description: 'Data de fim do período (YYYY-MM-DD). Obrigatório.',
    },
    projeto_id: {
      type: 'string',
      description: 'ID do projeto no SoftFlow. Ao menos um entre projeto_id e usuario é obrigatório.',
    },
    usuario: {
      type: 'string',
      description: 'ID do usuário no SoftFlow. Ao menos um entre projeto_id e usuario é obrigatório.',
    },
    meta_minutos: {
      type: 'string',
      description: 'Meta de minutos produtivos por dia (default: 480 = 8h).',
    },
    tolerancia_meta_minutos: {
      type: 'string',
      description: 'Tolerância acima da meta (default: 48 min).',
    },
    janela_inicio: {
      type: 'string',
      description: 'Início da janela comercial (default: "08:00").',
    },
    janela_fim: {
      type: 'string',
      description: 'Fim da janela comercial (default: "18:00").',
    },
    limite_almoco_minutos: {
      type: 'string',
      description: 'Duração esperada do almoço em minutos (default: 72 = 1h12).',
    },
    tolerancia_almoco_minutos: {
      type: 'string',
      description: 'Tolerância extra do almoço antes de gerar alerta (default: 13 min).',
    },
    limite_apagao_minutos: {
      type: 'string',
      description: 'Duração mínima de gap para considerar apagão de registro (default: 120 = 2h).',
    },
    limite_producao_virada_minutos: {
      type: 'string',
      description: 'Duração máxima de um único registro antes de considerar contador esquecido (default: 600 = 10h).',
    },
  },
  required: ['data_producao_inicio', 'data_producao_fim'],
};

/**
 * Schema de documentação (com example/description) — usado apenas pelo Swagger UI.
 */
export const productionAnalysisQueryParamsSchemaDocs = {
  type: 'object',
  properties: {
    data_producao_inicio: {
      type: 'string',
      description: 'Data de início do período (YYYY-MM-DD). Obrigatório.',
      example: '2026-05-26',
    },
    data_producao_fim: {
      type: 'string',
      description: 'Data de fim do período (YYYY-MM-DD). Obrigatório.',
      example: '2026-05-26',
    },
    projeto_id: {
      type: 'string',
      description:
        'ID do projeto no SoftFlow. Ao menos um entre projeto_id e usuario é obrigatório.',
      example: '3062',
    },
    usuario: {
      type: 'string',
      description:
        'ID do usuário no SoftFlow. Ao menos um entre projeto_id e usuario é obrigatório.',
      example: '2756',
    },
    meta_minutos: {
      type: 'string',
      description: 'Meta de minutos produtivos por dia (default: 480 = 8h).',
      example: '480',
    },
    tolerancia_meta_minutos: {
      type: 'string',
      description: 'Tolerância acima da meta (default: 48 min). Meta máxima = meta + tolerância.',
      example: '48',
    },
    janela_inicio: {
      type: 'string',
      description: 'Início da janela comercial (default: "08:00").',
      example: '08:00',
    },
    janela_fim: {
      type: 'string',
      description: 'Fim da janela comercial (default: "18:00").',
      example: '18:00',
    },
    limite_almoco_minutos: {
      type: 'string',
      description: 'Duração esperada do almoço em minutos (default: 72 = 1h12).',
      example: '72',
    },
    tolerancia_almoco_minutos: {
      type: 'string',
      description:
        'Tolerância extra do almoço antes de gerar alerta (default: 13 min). Alerta se > 1h25.',
      example: '13',
    },
    limite_apagao_minutos: {
      type: 'string',
      description:
        'Duração mínima de gap para considerar apagão de registro (default: 120 = 2h).',
      example: '120',
    },
    limite_producao_virada_minutos: {
      type: 'string',
      description:
        'Duração máxima de um único registro antes de considerar contador esquecido (default: 600 = 10h).',
      example: '600',
    },
  },
  required: ['data_producao_inicio', 'data_producao_fim'],
};

const inconsistenciaSchema = {
  type: 'string',
  example: 'Gap de 1h46m sem registro entre 12:00 e 13:46 (almoço estendido)',
};

const colaboradorSchema = {
  type: 'object',
  properties: {
    nome_suporte: { type: 'string', example: 'Samuel' },
    data_producao: { type: 'string', example: '2026-05-26' },
    status: {
      type: 'string',
      enum: ['CONFORME', 'ALERTA_LEVE', 'ALERTA_CRITICO', 'INCONSISTENCIA'],
      example: 'ALERTA_CRITICO',
    },
    motivo_status: {
      type: 'string',
      example: 'Produção de 5h25m — abaixo do mínimo de 6h. Gap de 1h46m entre 12:00 e 13:46.',
    },
    total_horas: { type: 'string', example: '5:25' },
    janela_trabalho: { type: 'string', example: '08:30 – 15:43' },
    horas_tecnicas: { type: 'string', example: '4:27' },
    horas_nao_tecnicas: { type: 'string', example: '0:58' },
    percentual_tecnico: { type: 'number', example: 82 },
    percentual_nao_tecnico: { type: 'number', example: 18 },
    inconsistencias: {
      type: 'array',
      items: inconsistenciaSchema,
    },
  },
};

const resumoSquadSchema = {
  type: 'object',
  properties: {
    total_colaboradores: { type: 'number', example: 10 },
    conforme: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 7 },
        percentual: { type: 'number', example: 70 },
      },
    },
    alerta_leve: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 1 },
        percentual: { type: 'number', example: 10 },
      },
    },
    alerta_critico: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 1 },
        percentual: { type: 'number', example: 10 },
      },
    },
    inconsistencia: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 1 },
        percentual: { type: 'number', example: 10 },
      },
    },
  },
};

export const singleColaboradorResponseSchemaDocs = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: colaboradorSchema,
    processedIn: {
      type: 'string',
      description: 'Tempo total de processamento',
      example: '1250ms',
    },
    error: {
      type: 'string',
      example: 'Mensagem de erro (apenas em caso de falha)',
    },
  },
  required: ['success'],
};

export const productionAnalysisResponseSchemaDocs = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: {
        resumo_squad: resumoSquadSchema,
        colaboradores: {
          type: 'array',
          items: colaboradorSchema,
        },
      },
    },
    processedIn: {
      type: 'string',
      description: 'Tempo total de processamento',
      example: '1250ms',
    },
    error: {
      type: 'string',
      example: 'Mensagem de erro (apenas em caso de falha)',
    },
  },
  required: ['success'],
};
