# Prompt para criar API de Assistente de IA para Preenchimento de Formulários

Crie uma API REST usando Node.js, TypeScript e Fastify, seguindo exatamente os padrões abaixo. A API deve ser um assistente de IA que processa descrições de bugs/melhorias/requisitos de produtos de empresas e retorna JSON estruturado para preencher automaticamente formulários no frontend.

## 📋 Requisitos Técnicos

### Tecnologias e Dependências

- **Runtime**: Node.js com TypeScript (ESM modules)
- **Framework**: Fastify 4.x
- **IA**: Google Gemini (pacote `@google/generative-ai`)
- **Documentação**: Swagger/OpenAPI com `@fastify/swagger` e `@fastify/swagger-ui`
- **Outros**: 
  - `@fastify/cors` para CORS
  - `dotenv` para variáveis de ambiente
  - `tsx` para desenvolvimento (watch mode)
  - TypeScript 5.x com configurações strict

### 📁 Estrutura de Pastas

Siga exatamente esta estrutura:

```
projeto/
├── server.ts                 # Arquivo principal do servidor
├── package.json
├── tsconfig.json
├── .env                      # Variáveis de ambiente
├── .gitignore
├── README.md
├── routes/                   # Rotas da API
│   ├── index.ts             # Rota principal (/)
│   ├── health.ts            # Health check (/api/health)
│   └── assistant.ts         # Rota principal do assistente (/api/assistant)
├── services/                # Serviços de negócio
│   ├── ai-service.ts        # Serviço de integração com Google Gemini
│   └── metrics-service.ts   # Serviço de métricas (opcional)
├── types/                   # Tipos TypeScript
│   └── assistant.ts         # Tipos para requests/responses do assistente
├── prompts/                 # Templates de prompts para IA
│   └── form-assistant.ts    # Prompt para processamento de relatórios
├── docs/                    # Documentação Swagger
│   ├── routes/              # Documentação das rotas
│   │   ├── index.ts
│   │   ├── health.ts
│   │   └── assistant.ts
│   └── schemas/             # Schemas JSON para validação
│       ├── assistant.ts
│       └── common.ts        # Schemas comuns (errorResponseSchema, etc.)
└── data/                    # Dados persistidos (se necessário)
```

## 🎯 Padrões de Código

1. **TypeScript Strict Mode**: Use tipagem forte, evite `any` desnecessários
2. **ESM Modules**: Use `import/export` com extensão `.js` nos imports TypeScript
3. **Arquitetura**:
   - Separe rotas, services, types e docs
   - Use Fastify plugins para rotas
   - Valide requests/responses com JSON Schema
4. **Error Handling**: Sempre retorne `{ success: boolean, error?: string, ... }`
5. **Logging**: Use `fastify.log` para logs estruturados

## ⚙️ Configuração TypeScript

Use `tsconfig.json` com:
- `target: ES2022`
- `module: ESNext`
- `strict: true`
- `declaration: true`
- `sourceMap: true`
- `moduleResolution: node`

## 🔐 Variáveis de Ambiente

Arquivo `.env` deve conter:
```env
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.0-flash
PORT=3001
```

## 🚀 Funcionalidade Principal

A API deve ter um endpoint `POST /api/assistant` que:

### 1. **Recebe**:
```json
{
  "description": "Texto ou aúdio com descrição do bug/melhoria/requisito",
}
```

### 2. **Processa** com IA (Google Gemini) para extrair:
- DescricaoResumo
- DescricaoCompleta
- Categoria

### 3. **Retorna** JSON estruturado:
```json
{
  "success": true,
  "data": {
    "DescricaoResumo": "Titulo/descrição resumo do report",
    "DescricaoCompleta": "Descrição completa do report, incluindo comportamento atual/esperado e passo a passo para reproduzir",
    "Categoria": "Categoria do Report, podendo ser BUG, MELHORIA ou REQUISITO",
    "InformacoesAdicionais": "Informação adicionais do report"
  },
  "confidence": 0.95,
  "processedIn": "1234ms"
}
```

## 🤖 Serviço de IA

Crie um `AIService`:
- Construtor recebe API key e model name
- Método principal: `async processReport(request: AssistantRequest): Promise<AssistantResponse>`
- Use prompt template em `prompts/form-assistant.ts`
- Configure `responseMimeType: 'application/json'` no Gemini
- Temperature: 0.2 (mais determinístico)
- Capture métricas (opcional, similar ao projeto SQL)

### Exemplo de estrutura do AIService:
```typescript
export class AIService {
  private client: GoogleGenerativeAI;
  private modelName: string;
  private generationConfig: GenerationConfig;
  private metricsService?: MetricsService;

  constructor(apiKey: string, modelName = 'gemini-1.5-flash', metricsService?: MetricsService) {
    // Inicialização similar ao projeto SQL
  }

  async processReport(request: AssistantRequest): Promise<AssistantResponse> {
    // Processar com Gemini e retornar JSON estruturado
  }
}
```

## 📝 Prompt para IA

O prompt deve instruir o Gemini a:
- Analisar o texto de entrada (bug/melhoria/requisito)
- Identificar título, descrição e categoria automaticamente
- Extrair informações relevantes de forma estruturada
- Formatar saída em JSON válido
- Usar português brasileiro em todas as respostas
- Retornar apenas JSON válido, sem texto adicional

### Exemplo de prompt:
```
Você é um assistente especializado em processar relatórios de bugs, melhorias e requisitos de produtos.
Analise a descrição fornecida e extraia as seguintes informações:

1. Título: Resumo conciso do problema/melhoria/requisito
2. Tipo: bug, improvement ou requirement
3. Descrição: Descrição detalhada formatada
4. InformacoesAdicionais: Informação adicionais para validação do report


Retorne APENAS um JSON válido no seguinte formato:
{
  "DescricaoResumo": "...",
  "Categoria": "bug",
  "DescricaoCompleta": "...",
}
```

## 📚 Documentação Swagger

Configure Swagger com:
- Tag: `assistant` para rotas do assistente
- Tag: `health` para health check
- Documentação completa de todos os endpoints
- Exemplos de request/response
- Schemas de validação JSON Schema

### Tags do Swagger:
```typescript
tags: [
  { 
    name: 'assistant', 
    description: 'Assistente de IA para preenchimento automático de formulários de relatórios' 
  },
  { 
    name: 'health', 
    description: 'Verificação de saúde e status da API' 
  }
]
```

## 🛣️ Rotas Necessárias

1. **GET /** - Rota de boas-vindas
   - Retorna: `{ message: "Bem-vindo ao Assistente de IA", status: "online" }`

2. **GET /health** - Health check
   - Retorna: `{ status: "ok", timestamp: "ISO string" }`

3. **POST /api/assistant** - Processar relatório e retornar JSON estruturado
   - Body: AssistantRequest
   - Response: AssistantResponse

## ⚠️ Tratamento de Erros

- Valide entrada com JSON Schema
- Retorne 400 para erros de validação
- Retorne 500 para erros internos
- Sempre retorne `{ success: false, error: "mensagem" }` em erros

### Exemplo de resposta de erro:
```json
{
  "success": false,
  "error": "A descrição é obrigatória"
}
```

## 📦 Scripts package.json

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch server.ts",
    "type-check": "tsc --noEmit"
  }
}
```

## 🔧 Configuração do Servidor

- Porta: 3000 (configurável via env `PORT`)
- CORS habilitado para desenvolvimento
- Logging estruturado com Fastify
- Swagger UI disponível em `/docs`
- Tratamento de erros global
- Inicialização do AIService no server.ts

### Exemplo de inicialização no server.ts:
```typescript
// Inicializar serviço de IA (Gemini)
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

let aiService: AIService;
try {
  aiService = new AIService(geminiApiKey, geminiModel);
  fastify.decorate('aiService', aiService);
  fastify.log.info(`Gemini configurado com o modelo: ${geminiModel}`);
} catch (error: any) {
  // Tratamento de erro
}
```

## ✨ Funcionalidades Extras (Opcional)

- Métricas de performance (latência, taxa de sucesso, confidence)
- Histórico de processamentos (em memória ou persistido)
- Endpoint para limpar/consultar métricas
- Validação de campos obrigatórios
- Suporte a múltiplos formatos de entrada

## 🎨 Exemplo de Uso

### Request:
```bash
POST http://localhost:3000/api/assistant
Content-Type: application/json

{
  "description": "Ao tentar fazer login no sistema, após inserir usuário e senha, aparece mensagem de erro 'Sessão expirada' mesmo sendo a primeira tentativa. O problema acontece em todos os navegadores testados (Chrome, Firefox, Safari).",
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "DescricaoResumo": "Erro de 'Sessão expirada' no login mesmo na primeira tentativa",
    "Categoria": "bug",
    "description": "O sistema exibe mensagem de erro 'Sessão expirada' durante o processo de login, mesmo sendo a primeira tentativa do usuário. O problema ocorre em todos os navegadores testados. 

    Comportamento esperado: O sistema deve autenticar o usuário e redirecionar para a página principal
    
    Passos para reproduzir:

    1. Acessar a tela de login
    2. Inserir usuário e senha válidos
    3. Clicar em 'Entrar
    4. Observar mensagem de erro 'Sessão expirada
    ",
    "InformacoesAdicionais": "Situação acontece no navegadores Chrome,Firefox e Safari"
  },
  "confidence": 0.92,
  "processedIn": "1234ms"
}
```

---

**Gere o projeto completo seguindo exatamente esses padrões e estrutura.**
