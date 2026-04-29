/**
 * Schemas JSON para validação e documentação do endpoint /api/report-analysis
 */

export const reportAnalysisRequestSchema = {
  type: 'object',
  properties: {
    report: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    audio: {
      type: 'string',
      format: 'binary',
    },
  },
  required: ['report'],
};

export const reportAnalysisRequestSchemaDocs = {
  type: 'object',
  properties: {
    report: {
      type: 'string',
      description: 'Texto do report feito pela equipe de suporte (obrigatório)',
      example:
        'O cliente pediu para trocar o banco de dados porque está lento. Ele diz que precisa de performance e quer que o sistema fique mais rápido em relatórios e listagens.',
    },
    description: {
      type: 'string',
      description:
        'Texto adicional do time de desenvolvimento (contexto técnico, hipóteses, pontos já verificados). Opcional; pode ser complementado/substituído por áudio.',
      example:
        'Já identificamos que a lentidão acontece principalmente em listagens sem filtros. Existe suspeita de ausência de índices e queries com muitos joins. O cliente citou que ocorre mais após importações.',
    },
    audio: {
      type: 'string',
      format: 'binary',
      description:
        'Arquivo de áudio enviado pelo time de desenvolvimento como description (opcional). Formatos suportados: MP3, WAV, M4A, etc.',
    },
  },
  required: ['report'],
};

export const reportAnalysisDataSchema = {
  type: 'object',
  properties: {
    analysis: {
      type: 'string',
    },
  },
  required: ['analysis'],
};

export const reportAnalysisDataSchemaDocs = {
  type: 'object',
  properties: {
    analysis: {
      type: 'string',
      description:
        'Texto estruturado com as seções obrigatórias: Agradecimento, Análise Técnica/Crítica, Hipóteses de Negócio e Call to Action (Ação Necessária).',
      example: `Agradecimento\n\nObrigado por compartilhar esse feedback — ele é muito importante para direcionarmos melhorias com segurança e impacto.\n\nAnálise Técnica/Crítica\n\nTrocar o banco de dados, por si só, dificilmente resolve a lentidão. Em muitos casos, a causa está em consultas sem índices, filtros não otimizados, paginação inadequada ou geração de relatórios sem pré-processamento.\n\nHipóteses de Negócio\n\n1) O cliente está com dor em relatórios que demoram a carregar em horários de pico.\n2) O cliente precisa de filtros mais específicos para reduzir volume de dados retornado.\n3) O cliente quer visibilidade segmentada (por grupo/filial/perfil) e hoje a query está trazendo dados demais.\n\nCall to Action (Ação Necessária)\n\n1) Em quais telas/relatórios a lentidão acontece e com qual frequência?\n2) Qual volume de dados (aprox. número de registros) e quais filtros o cliente usa?\n3) O problema ocorre para todos os usuários ou apenas alguns perfis/empresas?\n4) Há exemplos (prints/vídeos) com tempos de carregamento ou mensagens de erro?`,
    },
  },
  required: ['analysis'],
};

export const reportAnalysisResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
    },
    data: reportAnalysisDataSchema,
    confidence: {
      type: 'number',
    },
    processedIn: {
      type: 'string',
    },
    error: {
      type: 'string',
    },
  },
  required: ['success'],
};

export const reportAnalysisResponseSchemaDocs = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    data: reportAnalysisDataSchemaDocs,
    confidence: {
      type: 'number',
      description: 'Nível de confiança da resposta (0-1)',
      example: 0.95,
    },
    processedIn: {
      type: 'string',
      description: 'Tempo de processamento',
      example: '987ms',
    },
    error: {
      type: 'string',
      example: 'Mensagem de erro (apenas em caso de falha)',
    },
  },
  required: ['success'],
};

