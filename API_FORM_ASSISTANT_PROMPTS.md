# API — Form Assistant Prompts

Base URL: `http://localhost:3003` (ajustar conforme ambiente)

Todas as respostas seguem o padrão `{ success: boolean, data?, error?, message? }`.

O campo `template` contém **apenas a parte editável** do prompt. Listas de produtos/usuários e o schema JSON são montados automaticamente pelo backend.

---

## 1. Listar todos os prompts

Requisição:

```
GET http://localhost:3003/api/form-assistant-prompts
```

Retorno (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "ed26d196-808a-4cc5-ab5d-ea4115afd0ca",
      "squadSetor": null,
      "name": "Prompt Padrão",
      "isActive": true,
      "template": "Você é um assistente especializado em...",
      "createdAt": "2026-07-03T18:43:50.870Z",
      "updatedAt": "2026-07-03T19:24:19.740Z"
    },
    {
      "id": "6c88c10f-a3d0-4723-a19b-6e94777a4a71",
      "squadSetor": "SQUAD XP",
      "name": "XP Teste",
      "isActive": true,
      "template": "Regras do squad XP",
      "createdAt": "2026-07-03T19:25:06.179Z",
      "updatedAt": "2026-07-03T19:25:06.179Z"
    }
  ]
}
```

---

## 2. Buscar prompt DEFAULT

Requisição:

```
GET http://localhost:3003/api/form-assistant-prompts/default
```

Retorno (200):

```json
{
  "success": true,
  "data": {
    "id": "ed26d196-808a-4cc5-ab5d-ea4115afd0ca",
    "squadSetor": null,
    "name": "Prompt Padrão",
    "isActive": true,
    "template": "Você é um assistente especializado em...",
    "createdAt": "2026-07-03T18:43:50.870Z",
    "updatedAt": "2026-07-03T19:24:19.740Z"
  }
}
```

Retorno (404):

```json
{
  "success": false,
  "error": "Prompt DEFAULT não encontrado no banco."
}
```

---

## 3. Buscar prompt resolvido do Squad

Retorna o prompt que o squad está usando. Se não tiver prompt próprio ativo, retorna o DEFAULT com `isDefault: true`.

Requisição:

```
GET http://localhost:3003/api/form-assistant-prompts/squad/SQUAD%20XP
```

> O `setor` deve ser URL-encoded (ex: `SQUAD BACKOFFICE` → `SQUAD%20BACKOFFICE`) e começar com `SQUAD`.

Retorno (200) — squad com prompt próprio:

```json
{
  "success": true,
  "data": {
    "id": "6c88c10f-a3d0-4723-a19b-6e94777a4a71",
    "squadSetor": "SQUAD XP",
    "name": "XP Teste",
    "isActive": true,
    "template": "Regras do squad XP",
    "createdAt": "2026-07-03T19:25:06.179Z",
    "updatedAt": "2026-07-03T19:25:06.179Z",
    "isDefault": false
  }
}
```

Retorno (200) — squad sem prompt próprio (usa DEFAULT):

```json
{
  "success": true,
  "data": {
    "id": "ed26d196-808a-4cc5-ab5d-ea4115afd0ca",
    "squadSetor": null,
    "name": "Prompt Padrão",
    "isActive": true,
    "template": "Você é um assistente especializado em...",
    "createdAt": "2026-07-03T18:43:50.870Z",
    "updatedAt": "2026-07-03T19:24:19.740Z",
    "isDefault": true
  }
}
```

Retorno (400):

```json
{
  "success": false,
  "error": "O parâmetro 'setor' deve começar com 'SQUAD'."
}
```

---

## 4. Criar prompt para um Squad

Requisição:

```
POST http://localhost:3003/api/form-assistant-prompts
Content-Type: application/json
```

Body:

```json
{
  "squadSetor": "SQUAD XP",
  "name": "XP - Abertura de Caso",
  "template": "Você é um assistente do SQUAD XP.\n\n### REGRAS DE COMPORTAMENTO:\n- Seja objetivo e técnico."
}
```

Retorno (201):

```json
{
  "success": true,
  "data": {
    "id": "6c88c10f-a3d0-4723-a19b-6e94777a4a71",
    "squadSetor": "SQUAD XP",
    "name": "XP - Abertura de Caso",
    "isActive": true,
    "template": "Você é um assistente do SQUAD XP.\n\n### REGRAS DE COMPORTAMENTO:\n- Seja objetivo e técnico.",
    "createdAt": "2026-07-03T19:25:06.179Z",
    "updatedAt": "2026-07-03T19:25:06.179Z"
  }
}
```

Retorno (400):

```json
{
  "success": false,
  "error": "O campo 'squadSetor' deve começar com 'SQUAD'. Outros setores usam o prompt DEFAULT."
}
```

Retorno (409):

```json
{
  "success": false,
  "error": "Já existe um prompt cadastrado para o setor 'SQUAD XP'. Use PUT para editar."
}
```

---

## 5. Editar prompt

Funciona para o DEFAULT e para prompts de squad. Informar ao menos `name` ou `template`.

Requisição:

```
PUT http://localhost:3003/api/form-assistant-prompts/6c88c10f-a3d0-4723-a19b-6e94777a4a71
Content-Type: application/json
```

Body:

```json
{
  "name": "XP - Abertura de Caso v2",
  "template": "Novo conteúdo editável do prompt..."
}
```

Retorno (200):

```json
{
  "success": true,
  "data": {
    "id": "6c88c10f-a3d0-4723-a19b-6e94777a4a71",
    "squadSetor": "SQUAD XP",
    "name": "XP - Abertura de Caso v2",
    "isActive": true,
    "template": "Novo conteúdo editável do prompt...",
    "createdAt": "2026-07-03T19:25:06.179Z",
    "updatedAt": "2026-07-03T19:30:00.000Z"
  }
}
```

Retorno (400):

```json
{
  "success": false,
  "error": "Informe ao menos 'name' ou 'template' para atualizar."
}
```

Retorno (404):

```json
{
  "success": false,
  "error": "Prompt não encontrado."
}
```

---

## 6. Ativar / Desativar prompt de Squad

Alterna `isActive`. Quando desativado, o squad passa a usar o DEFAULT. **Não funciona no prompt DEFAULT.**

Requisição:

```
PATCH http://localhost:3003/api/form-assistant-prompts/6c88c10f-a3d0-4723-a19b-6e94777a4a71/toggle
```

Retorno (200):

```json
{
  "success": true,
  "data": {
    "id": "6c88c10f-a3d0-4723-a19b-6e94777a4a71",
    "isActive": false
  }
}
```

Retorno (400) — tentativa no DEFAULT:

```json
{
  "success": false,
  "error": "O prompt DEFAULT não pode ser desativado."
}
```

---

## 7. Excluir prompt de Squad

**Não funciona no prompt DEFAULT.**

Requisição:

```
DELETE http://localhost:3003/api/form-assistant-prompts/6c88c10f-a3d0-4723-a19b-6e94777a4a71
```

Retorno (200):

```json
{
  "success": true,
  "message": "Prompt do SQUAD XP removido com sucesso."
}
```

Retorno (400) — tentativa no DEFAULT:

```json
{
  "success": false,
  "error": "O prompt DEFAULT não pode ser removido."
}
```

---

## 8. Abertura de caso com IA (uso do prompt por setor)

Na abertura de caso, enviar o `squadSetor` do usuário logado para o backend resolver o prompt correto.

Requisição:

```
POST http://localhost:3003/api/assistant
Content-Type: application/json
```

Body:

```json
{
  "description": "Ao fazer login no SOFTSHOP aparece erro de sessão expirada...",
  "squadSetor": "SQUAD XP"
}
```

> Também aceita `multipart/form-data` com campos `description`, `squadSetor` e/ou arquivo `audio`.

Retorno (200):

```json
{
  "success": true,
  "data": {
    "title": "SOFTSHOP > Login: Erro de sessão expirada",
    "description": "Comportamento atual:\n\n...",
    "category": "BUG",
    "additionalInformation": "",
    "product": {
      "id": "37",
      "nome_projeto": "SOFTSHOP",
      "setor": "SQUAD BACKOFFICE"
    },
    "users": []
  },
  "confidence": 0.95,
  "processedIn": "1234ms"
}
```

---

## Regras rápidas para o front

| Regra | Detalhe |
|-------|---------|
| `squadSetor: null` | É o prompt DEFAULT global |
| Setor começa com `SQUAD` | Pode ter prompt próprio |
| Outros setores | Sempre usam o DEFAULT (não cadastram prompt) |
| `isDefault: true` | Squad está usando o prompt padrão |
| `template` | Só regras editáveis — não incluir produtos/usuários nem JSON de saída |
| DEFAULT | Pode editar, não pode excluir nem desativar |
