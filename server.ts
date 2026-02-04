import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { AIService } from './services/ai-service.js';
import { indexRoutes } from './routes/index.js';
import { healthRoutes } from './routes/health.js';
import { assistantRoutes } from './routes/assistant.js';

// Carregar variáveis de ambiente
dotenv.config();

// Declaração de tipos para decorators do Fastify
declare module 'fastify' {
  interface FastifyInstance {
    aiService?: AIService;
  }
}

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: 'info',
    },
  });

  // Registrar multipart para upload de arquivos
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
  });

  // Registrar CORS
  await fastify.register(cors, {
    origin: true, // Permitir todas as origens em desenvolvimento
  });

  // Configurar Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Assistente de IA - API de Preenchimento de Formulários',
        description: 'API REST para processamento de relatórios de bugs, melhorias e requisitos usando Google Gemini',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3001}`,
          description: 'Servidor de desenvolvimento',
        },
      ],
      tags: [
        {
          name: 'assistant',
          description: 'Assistente de IA para preenchimento automático de formulários de relatórios',
        },
        {
          name: 'health',
          description: 'Verificação de saúde e status da API',
        },
      ],
    },
  });

  // Configurar Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Inicializar serviço de IA (Gemini)
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  let aiService: AIService | undefined;
  try {
    if (!geminiApiKey || geminiApiKey === 'your-api-key-here') {
      fastify.log.warn('GEMINI_API_KEY não configurada. O serviço de IA não funcionará corretamente.');
      fastify.log.warn('Configure a variável GEMINI_API_KEY no arquivo .env');
    } else {
      aiService = new AIService(geminiApiKey, geminiModel);
      fastify.decorate('aiService', aiService);
      fastify.log.info(`Gemini configurado com o modelo: ${geminiModel}`);
    }
  } catch (error: any) {
    fastify.log.error(error, 'Erro ao inicializar AIService');
    // Em produção, você pode querer encerrar o servidor aqui
    // process.exit(1);
  }

  // Registrar rotas
  await fastify.register(indexRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(assistantRoutes);

  // Tratamento global de erros
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error, 'Erro não tratado');
    reply.code(500).send({
      success: false,
      error: (error as Error).message || 'Erro interno do servidor',
    });
  });

  return fastify;
}

// Inicializar servidor
async function start() {
  try {
    const server = await buildServer();
    const port = Number(process.env.PORT) || 3001;
    const host = '0.0.0.0';

    await server.listen({ port, host });
    server.log.info(`Servidor rodando em http://${host}:${port}`);
    server.log.info(`Documentacao Swagger disponivel em http://${host}:${port}/docs`);
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('server.ts')) {
  start();
}

export { buildServer };
