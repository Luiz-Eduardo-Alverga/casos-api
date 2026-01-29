# Assistente de IA - API de Preenchimento de Formulários

API REST desenvolvida com Node.js, TypeScript e Fastify que utiliza Google Gemini para processar descrições de bugs, melhorias e requisitos, retornando dados estruturados em JSON para preenchimento automático de formulários.

## 🚀 Tecnologias

- **Node.js** com TypeScript (ESM modules)
- **Fastify 4.x** - Framework web rápido
- **Google Gemini** - Modelo de IA para processamento
- **Swagger/OpenAPI** - Documentação automática da API

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Chave de API do Google Gemini

## 🔧 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` e adicione sua chave de API:
```env
GEMINI_API_KEY=sua-chave-aqui
GEMINI_MODEL=gemini-2.0-flash
PORT=3001
```

## 🏃 Executando

### Modo Desenvolvimento (com watch)
```bash
npm run dev
```

### Modo Produção
```bash
npm run build
npm start
```

## 📚 Endpoints

### GET /
Rota de boas-vindas

### GET /health
Health check da API

### POST /api/assistant
Processa uma descrição e retorna dados estruturados

**Request:**
```json
{
  "description": "Descrição do bug/melhoria/requisito"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "DescricaoResumo": "Título/resumo",
    "DescricaoCompleta": "Descrição detalhada",
    "Categoria": "BUG" | "MELHORIA" | "REQUISITO",
    "InformacoesAdicionais": "Informações adicionais"
  },
  "confidence": 0.95,
  "processedIn": "1234ms"
}
```

## 📖 Documentação

A documentação Swagger está disponível em:
- **Swagger UI**: http://localhost:3001/docs

## 🏗️ Estrutura do Projeto

```
projeto/
├── server.ts                 # Servidor principal
├── routes/                   # Rotas da API
│   ├── index.ts
│   ├── health.ts
│   └── assistant.ts
├── services/                 # Serviços de negócio
│   └── ai-service.ts
├── types/                    # Tipos TypeScript
│   └── assistant.ts
├── prompts/                  # Templates de prompts
│   └── form-assistant.ts
├── docs/                     # Documentação Swagger
│   ├── routes/
│   └── schemas/
└── data/                     # Dados persistidos (se necessário)
```

## 🧪 Exemplo de Uso

```bash
curl -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Ao tentar fazer login, aparece erro de sessão expirada mesmo na primeira tentativa"
  }'
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia em modo desenvolvimento com watch
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia o servidor em produção
- `npm run type-check` - Verifica tipos sem compilar

## ⚠️ Notas

- Certifique-se de ter uma chave de API válida do Google Gemini
- A API está configurada para aceitar CORS de todas as origens em desenvolvimento
- Em produção, ajuste as configurações de CORS conforme necessário
