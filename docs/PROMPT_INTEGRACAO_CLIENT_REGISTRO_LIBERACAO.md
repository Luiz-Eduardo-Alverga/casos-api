# Tarefa: Integrar API de Registro de Liberação (IA) e Cadastro de Prompts por Tipo

A API backend (casos-api) ganhou dois recursos novos que precisam ser integrados no client. Não há autenticação exigida por essa API (CORS liberado) — use a base URL configurada no ambiente (ex.: `http://localhost:3004` em dev).

---

## 1. Endpoint: Gerar Registro de Liberação via IA

`GET /api/release-notes/:liberacaoId`

### Parâmetros
- `liberacaoId` (path, obrigatório): id do registro de liberação no SoftFlow (ex.: `1057`).
- `promptId` (query, opcional): uuid de um prompt cadastrado do tipo `RELEASE_NOTES` (ver seção 2). Se omitido, o backend usa o prompt DEFAULT global desse tipo automaticamente.

Exemplo de chamada:
```
GET /api/release-notes/1057?promptId=3fa85f64-5717-4562-b3fc-2c963f66afa6
```

### Resposta de sucesso (200)
```json
{
  "success": true,
  "data": {
    "registro_liberacao": "## 📌 REGISTRO DE LIBERAÇÃO – HOTFIX\n\n**Produto:** ...",
    "produto": "Smart (Softcom Smart)",
    "versoes": ["7.1.3.0"],
    "total_casos": 14
  },
  "processedIn": "3450ms"
}
```

- `registro_liberacao` é uma string em **Markdown** (headers `##`/`###`, negrito `**...**`, listas `- item`, emojis). Renderize com um componente de Markdown (ex.: `react-markdown`, `marked`), não como texto puro. As quebras de linha vêm como `\n` (resolvidas automaticamente ao desserializar o JSON).
- `produto`: nome do(s) produto(s) identificado(s) nos itens da liberação.
- `versoes`: array com a(s) versão(ões) distintas encontradas.
- `total_casos`: quantidade de casos retornados pela Softflow e considerados na análise.

### Respostas de erro
- `400`: parâmetro `liberacaoId` ausente/inválido.
- `404`: nenhum item encontrado para o `liberacaoId` informado (mensagem: "Nenhum item encontrado para o registro de liberação informado."), OU o `promptId` informado não existe/não é do tipo `RELEASE_NOTES`.
- `503`: serviço de IA indisponível no backend.
- `500`: erro interno.

Todas seguem o formato: `{ "success": false, "error": "mensagem" }`.

### UX sugerida
- Um campo/input para o usuário informar o `liberacaoId` (número do registro de liberação do SoftFlow).
- Opcionalmente, um seletor de "modelo de prompt" (ver seção 2) antes de gerar — se o usuário não escolher nenhum, não envie `promptId` (usa o DEFAULT).
- Um botão "Gerar Registro de Liberação" que chama o endpoint e mostra loading (a geração pode levar alguns segundos, é uma chamada de IA).
- Renderizar `registro_liberacao` como Markdown, com opção de copiar o texto renderizado ou o markdown bruto.
- Tratar o 404 de "nenhum item encontrado" com uma mensagem amigável tipo "Nenhum caso foi encontrado neste registro de liberação ainda."

---

## 2. Cadastro de Prompts por Tipo (endpoint já existente, agora com `tipo`)

A tabela/endpoint de prompts (`/api/form-assistant-prompts`) que já existia para o assistente de abertura de caso agora suporta múltiplos "tipos" de prompt. Isso é relevante porque o endpoint da seção 1 pode consumir prompts do tipo `RELEASE_NOTES`.

### Conceito importante: `tipo`
```ts
type PromptType = "FORM_ASSISTANT" | "RELEASE_NOTES";
```

- **`FORM_ASSISTANT`** (já existente, comportamento **inalterado**): 1 prompt por squad, resolvido automaticamente. Não precisa mudar nada na tela que já existe para isso.
- **`RELEASE_NOTES`** (novo): um squad (ou o escopo global, sem squad) pode ter **vários prompts cadastrados ao mesmo tempo**, todos podendo estar habilitados (`isActive: true`) simultaneamente. **Não existe resolução automática exclusiva** — é o usuário no client quem escolhe qual prompt usar, informando o `promptId` dele na chamada da seção 1. Sem `promptId`, cai no prompt DEFAULT (`squadSetor: null`) desse tipo.

### Modelo do objeto Prompt
```ts
interface Prompt {
  id: string; // uuid
  squadSetor: string | null; // null = prompt global/DEFAULT
  tipo: "FORM_ASSISTANT" | "RELEASE_NOTES";
  name: string;
  isActive: boolean;
  template: string; // conteúdo editável do prompt
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}
```

Para prompts do tipo `RELEASE_NOTES`, o `template` contém os placeholders `{{produto}}`, `{{versoes}}` e `{{ticketsList}}`, que são substituídos automaticamente pelo backend — **não remova esses placeholders** se construir uma tela de edição de template; talvez vale mostrar um aviso/tooltip explicando o que cada um representa.

### Rotas

**Listar prompts**
`GET /api/form-assistant-prompts?tipo=RELEASE_NOTES&squadSetor=SQUAD%20XP`
- `tipo` (opcional, default `FORM_ASSISTANT` se omitido — cuidado para não esquecer de passar `tipo=RELEASE_NOTES` explicitamente onde for o caso).
- `squadSetor` (opcional): filtra por um squad específico.
- Resposta: `{ success: true, data: Prompt[] }`.
- Use essa rota para montar o **seletor de prompts de Registro de Liberação** (liste os do squad do usuário logado + os globais, com `squadSetor: null`).

**Buscar o prompt DEFAULT de um tipo**
`GET /api/form-assistant-prompts/default?tipo=RELEASE_NOTES`
- Resposta: `{ success: true, data: Prompt }` ou `404` se não existir.

**Buscar prompt resolvido de um squad (somente `FORM_ASSISTANT`, comportamento antigo)**
`GET /api/form-assistant-prompts/squad/:setor`
- Não use essa rota para `RELEASE_NOTES` — ela não faz sentido nesse modelo de múltiplos prompts.

**Criar prompt**
`POST /api/form-assistant-prompts`
```json
{
  "tipo": "RELEASE_NOTES",
  "squadSetor": "SQUAD XP",
  "name": "Registro de Liberação - Squad XP",
  "template": "...conteúdo com {{produto}}, {{versoes}}, {{ticketsList}}..."
}
```
- `squadSetor` é **opcional** para `RELEASE_NOTES` (pode criar um prompt global também, além do DEFAULT); se informado, deve começar com `"SQUAD"`.
- Para `RELEASE_NOTES` **não há conflito** — pode criar quantos prompts quiser para o mesmo squad (diferente do `FORM_ASSISTANT`, que dá `409` se já existir um para o squad).
- Resposta: `201` com `{ success: true, data: Prompt }`.

**Editar prompt**
`PUT /api/form-assistant-prompts/:id`
```json
{ "name": "Novo nome", "template": "novo conteúdo" }
```
- Ambos os campos opcionais (mande ao menos um).

**Habilitar/desabilitar prompt**
`PATCH /api/form-assistant-prompts/:id/toggle`
- Simplesmente inverte `isActive`. Não é uma "ativação exclusiva" — não desabilita os outros prompts do mesmo squad/tipo. Sugestão de uso na UI: um switch/toggle por item da lista, para esconder prompts "desativados" do seletor de geração sem apagá-los.
- Não é permitido desativar o prompt DEFAULT (`squadSetor: null`) — retorna `400`.

**Remover prompt**
`DELETE /api/form-assistant-prompts/:id`
- Não é permitido remover o prompt DEFAULT — retorna `400`.

### UX sugerida para o cadastro de prompts `RELEASE_NOTES`
- Uma tela de listagem (reaproveitando o padrão que já existe para prompts de `FORM_ASSISTANT`, se houver) mas explicitamente filtrada por `tipo=RELEASE_NOTES`, mostrando: nome, squad (ou "Global"), status ativo/inativo, e ações (editar, habilitar/desabilitar, excluir — exceto no DEFAULT).
- Formulário de criação/edição com campo de nome, squad (opcional, select com squads existentes) e um textarea grande para o `template`, com uma nota fixa lembrando dos placeholders `{{produto}}`, `{{versoes}}`, `{{ticketsList}}`.
- No fluxo de geração (seção 1), um dropdown "Modelo de prompt" listando os prompts ativos de `RELEASE_NOTES` (globais + do squad do usuário) — item padrão "Usar prompt padrão" (sem enviar `promptId`).
