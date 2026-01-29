/**
 * Schemas comuns para Swagger
 */

export const errorResponseSchema = {
  type: 'object',
  properties: {
    success: {
      type: 'boolean',
      example: false,
    },
    error: {
      type: 'string',
      example: 'Mensagem de erro',
    },
  },
  required: ['success', 'error'],
};
