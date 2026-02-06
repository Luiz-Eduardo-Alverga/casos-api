/**
 * Schemas JSON para validação e documentação do endpoint /api/assistant
 */

// Schema de validação (sem example - usado pelo Fastify para validação)
export const assistantRequestSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
    },
    audio: {
      type: 'string',
      format: 'binary', // Para Swagger UI mostrar upload de arquivo
    },
  },
  // Não requer description obrigatória, mas pelo menos um deve ser fornecido
};

// Schema de documentação (com example - usado pelo Swagger)
export const assistantRequestSchemaDocs = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'Texto com descrição do bug/melhoria/requisito (opcional se audio for fornecido)',
      example: 'Ao tentar fazer login no sistema, após inserir usuário e senha, aparece mensagem de erro "Sessão expirada" mesmo sendo a primeira tentativa.',
    },
    audio: {
      type: 'string',
      format: 'binary',
      description: 'Arquivo de áudio com descrição do bug/melhoria/requisito (opcional se description for fornecido). Formatos suportados: MP3, WAV, M4A, etc.',
    },
  },
};

// Schema de validação
export const assistantDataSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    category: {
      type: 'string',
      enum: ['BUG', 'MELHORIA', 'REQUISITO'],
    },
    additionalInformation: {
      type: 'string',
    },
    product: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nome_projeto: { type: 'string' },
        setor: { type: ['string', 'null'] },
      },
    },
    users: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nome_suporte: { type: 'string' },
          setor: { type: ['string', 'null'] },
          usuario_discord: { type: ['string', 'null'] },
        },
      },
    },
  },
  required: ['title', 'description', 'category'],
};

// Schema de documentação
export const assistantDataSchemaDocs = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Título/resumo conciso do report',
      example: 'SOFTSHOP > Login: Erro de "Sessão expirada" no login mesmo na primeira tentativa',
    },
    description: {
      type: 'string',
      description: 'Descrição completa do report, incluindo comportamento atual/esperado e passo a passo para reproduzir',
      example: 'O sistema exibe mensagem de erro "Sessão expirada" durante o processo de login, mesmo sendo a primeira tentativa do usuário.\n\nComportamento esperado: O sistema deve autenticar o usuário e redirecionar para a página principal\n\nPassos para reproduzir:\n1. Acessar a tela de login\n2. Inserir usuário e senha válidos\n3. Clicar em "Entrar"\n4. Observar mensagem de erro "Sessão expirada"',
    },
    category: {
      type: 'string',
      enum: ['BUG', 'MELHORIA', 'REQUISITO'],
      description: 'Categoria do Report',
      example: 'BUG',
    },
    additionalInformation: {
      type: 'string',
      description: 'Informações adicionais do report',
      example: 'Situação acontece em todos os navegadores testados (Chrome, Firefox, Safari)',
    },
    product: {
      type: 'object',
      description: 'Produto identificado no report (identificado pela IA)',
      properties: {
        id: { type: 'string', example: '37' },
        nome_projeto: { type: 'string', example: 'SOFTSHOP' },
        setor: { type: ['string', 'null'], example: 'SQUAD BACKOFFICE' },
      },
    },
    users: {
      type: 'array',
      description: 'Usuários identificados no report (identificados pela IA)',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '28' },
          nome_suporte: { type: 'string', example: '3Gleison' },
          setor: { type: ['string', 'null'], example: 'SQUAD BACKOFFICE' },
          usuario_discord: { type: ['string', 'null'], example: 'gleisonmaia' },
        },
      },
    },
  },
  required: ['title', 'description', 'category'],
};

// Schema de validação
export const assistantResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
    },
    data: assistantDataSchema,
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

// Schema de documentação
export const assistantResponseSchemaDocs = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: true,
    },
    data: assistantDataSchemaDocs,
    confidence: {
      type: 'number',
      description: 'Nível de confiança da resposta (0-1)',
      example: 0.95,
    },
    processedIn: {
      type: 'string',
      description: 'Tempo de processamento',
      example: '1234ms',
    },
    error: {
      type: 'string',
      example: 'Mensagem de erro (apenas em caso de falha)',
    },
  },
  required: ['success'],
};
