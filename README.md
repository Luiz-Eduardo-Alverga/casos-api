# Assistente de IA - API de Preenchimento de Formulários

API REST desenvolvida com Node.js, TypeScript e Fastify que utiliza Google Gemini para processar descrições de bugs, melhorias e requisitos, retornando dados estruturados em JSON para preenchimento automático de formulários. A IA identifica automaticamente produtos e usuários mencionados no conteúdo (texto ou áudio).

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
Processa uma descrição (texto ou áudio) e retorna dados estruturados. A IA identifica automaticamente o produto e usuários mencionados no conteúdo.

**Request (JSON):**
```json
{
  "description": "Descrição do bug/melhoria/requisito"
}
```

**Request (Multipart/form-data):**
- `description` (opcional): Texto com a descrição
- `audio` (opcional): Arquivo de áudio (MP3, WAV, M4A, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "SOFTSHOP > Login: Erro de sessão expirada",
    "description": "Comportamento atual:\n...\n\nComportamento esperado:\n...\n\nPassos para reproduzir:\n1. Acessar...",
    "category": "BUG",
    "additionalInformation": "Link do Discord: ...",
    "product": {
      "id": "37",
      "nome_projeto": "SOFTSHOP",
      "setor": "SQUAD BACKOFFICE"
    },
    "users": [
      {
        "id": "28",
        "nome_suporte": "3Gleison",
        "setor": "SQUAD BACKOFFICE",
        "usuario_discord": "gleisonmaia"
      }
    ]
  },
  "confidence": 0.95,
  "processedIn": "1234ms"
}
```

**Características:**
- ✅ Identifica automaticamente o produto mencionado (um por report)
- ✅ Identifica usuários mencionados (por nome ou Discord)
- ✅ Processa texto e áudio
- ✅ Extrai informações estruturadas (título, descrição, categoria)
- ✅ Formata descrição conforme categoria (BUG, MELHORIA ou REQUISITO)

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
└── data/                     # Dados de referência
    ├── products.json         # Lista de produtos/aplicações
    └── users.json            # Lista de usuários (relatores, desenvolvedores, QA)
```

## 🧪 Exemplos de Uso

### Enviar descrição em texto (JSON)
```bash
curl -X POST http://localhost:3001/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "description": "No SOFTSHOP, ao tentar fazer login, aparece erro de sessão expirada mesmo na primeira tentativa. O usuário @gleisonmaia relatou o problema."
  }'
```

### Enviar arquivo de áudio (Multipart)
```bash
curl -X POST http://localhost:3001/api/assistant \
  -F "audio=@descricao.mp3" \
  -F "description=Complemento em texto (opcional)"
```

### Exemplo de resposta com produto e usuários identificados
```json
{
  "success": true,
  "data": {
    "title": "SOFTSHOP > Login: Erro de sessão expirada na primeira tentativa",
    "description": "Comportamento atual:\nAo tentar fazer login no SOFTSHOP, o sistema exibe mensagem de erro 'Sessão expirada' mesmo sendo a primeira tentativa do usuário.\n\nComportamento esperado:\nO sistema deve autenticar o usuário e redirecionar para a página principal após login bem-sucedido.\n\nPassos para reproduzir:\n1. Acessar a tela de login do SOFTSHOP\n2. Inserir usuário e senha válidos\n3. Clicar em 'Entrar'\n4. Observar mensagem de erro 'Sessão expirada'",
    "category": "BUG",
    "additionalInformation": "",
    "product": {
      "id": "37",
      "nome_projeto": "SOFTSHOP",
      "setor": "SQUAD BACKOFFICE"
    },
    "users": [
      {
        "id": "28",
        "nome_suporte": "3Gleison",
        "setor": "SQUAD BACKOFFICE",
        "usuario_discord": "gleisonmaia"
      }
    ]
  },
  "confidence": 0.95,
  "processedIn": "2156ms"
}
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia em modo desenvolvimento com watch
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia o servidor em produção
- `npm run type-check` - Verifica tipos sem compilar

## 🤖 Identificação Automática de Produtos e Usuários

A IA analisa o conteúdo fornecido (texto ou áudio transcrito) e identifica automaticamente:

- **Produto**: Identifica o produto/aplicação mencionado no report. Cada report é específico para um único produto.
- **Usuários**: Identifica usuários mencionados por nome de suporte, nome do Discord (com @ ou sem), ou referências indiretas.

Os dados de referência são carregados dos arquivos:
- `data/products.json` - Lista completa de produtos/aplicações da empresa
- `data/users.json` - Lista completa de usuários (relatores, desenvolvedores, QA)

A IA usa matching inteligente para identificar produtos e usuários mesmo com variações de nomes, abreviações ou referências indiretas.

## ⚠️ Notas

- Certifique-se de ter uma chave de API válida do Google Gemini
- A API está configurada para aceitar CORS de todas as origens em desenvolvimento
- Em produção, ajuste as configurações de CORS conforme necessário
- Os arquivos `products.json` e `users.json` são carregados automaticamente na inicialização do serviço