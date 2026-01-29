/**
 * Documentação Swagger para rota raiz
 */

export const indexRouteSchema = {
  tags: [],
  summary: 'Rota de boas-vindas',
  description: 'Retorna mensagem de boas-vindas da API',
  response: {
    200: {
      description: 'Resposta de sucesso',
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Bem-vindo ao Assistente de IA',
        },
        status: {
          type: 'string',
          example: 'online',
        },
      },
    },
  },
};
