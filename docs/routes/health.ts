/**
 * Documentação Swagger para rota de health check
 */

export const healthRouteSchema = {
  tags: ['health'],
  summary: 'Health check',
  description: 'Verifica o status de saúde da API',
  response: {
    200: {
      description: 'API está funcionando',
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-01T12:00:00.000Z',
        },
      },
      required: ['status', 'timestamp'],
    },
  },
};
