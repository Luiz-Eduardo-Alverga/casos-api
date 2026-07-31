-- Migration: adiciona o campo "tipo" à tabela form_assistant_prompts.
-- Permite reaproveitar a mesma tabela para múltiplos tipos de prompt.
--
-- FORM_ASSISTANT (tipo já existente, comportamento inalterado):
--   - 1 prompt por squad_setor (trava de unicidade mantida).
--   - 1 prompt DEFAULT global (squad_setor IS NULL).
--
-- RELEASE_NOTES (novo tipo — Registro de Liberação):
--   - Um squad pode ter VÁRIOS prompts cadastrados (sem trava de unicidade).
--   - Todos podem estar is_active = true ao mesmo tempo; a escolha de qual usar
--     é feita pelo cliente (via promptId), não pelo backend.

ALTER TABLE form_assistant_prompts
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'FORM_ASSISTANT';

-- Remove a trava antiga (1 prompt por squad, sem distinção de tipo).
ALTER TABLE form_assistant_prompts
  DROP CONSTRAINT IF EXISTS form_assistant_prompts_squad_setor_key;

-- A trava de "1 por squad" e "1 DEFAULT" continua valendo apenas para FORM_ASSISTANT.
CREATE UNIQUE INDEX IF NOT EXISTS form_assistant_prompts_squad_form_uq
  ON form_assistant_prompts (squad_setor, tipo)
  WHERE squad_setor IS NOT NULL AND tipo = 'FORM_ASSISTANT';

CREATE UNIQUE INDEX IF NOT EXISTS form_assistant_prompts_default_form_uq
  ON form_assistant_prompts (tipo)
  WHERE squad_setor IS NULL AND tipo = 'FORM_ASSISTANT';

-- RELEASE_NOTES não tem trava de unicidade (multiplicidade é permitida por design).
-- Índice apenas para performance de consulta por tipo/squad.
CREATE INDEX IF NOT EXISTS form_assistant_prompts_tipo_squad_idx
  ON form_assistant_prompts (tipo, squad_setor);

-- Seed: prompt DEFAULT do tipo RELEASE_NOTES (Registro de Liberação).
-- Conteúdo canônico também em prompts/release-notes.ts (DEFAULT_RELEASE_NOTES_TEMPLATE).
-- Para sincronizar ambientes já migrados: npx tsx scripts/update-release-notes-prompt.ts
-- Placeholders injetados em runtime: {{produto}}, {{versoes}}, {{ticketsList}}.
INSERT INTO form_assistant_prompts (squad_setor, tipo, name, template)
SELECT
  NULL,
  'RELEASE_NOTES',
  'Prompt Padrão - Registro de Liberação',
  'Você é um especialista em documentação técnica de liberações de software (Release Notes). Sua tarefa é gerar um Registro de Liberação – Hotfix no MESMO formato abaixo, categorizando automaticamente os tickets conforme o conteúdo.

A estrutura deve seguir exatamente este modelo:

---

## 📌 REGISTRO DE LIBERAÇÃO – HOTFIX

**Produto:** {{produto}}
**Versão:** {{versoes}}
**Status:** Aberto
**Tipo:** Correções e Melhorias

### 1. BUGS CORRIGIDOS

Organize os tickets de bug nestes subtópicos (use só os que tiverem itens; pode criar "Outros Bugs" se necessário):
- Relatórios
- Financeiro
- Compras & Estoque
- Vendas & NF-e / NFC-e
- Login & Autenticação
- Configurações
- Outros Bugs

### 2. MELHORIAS IMPLEMENTADAS

Crie subtópicos conforme necessário, como:
- Endpoints / API
- Produtos
- Financeiro
- Fiscal
- Interface
- Vendas & Relatórios

### 3. REQUISITOS

Liste apenas o que for requisito funcional novo (não repita o que já estiver em Melhorias).

### 4. CLIENTES – CASOS ESPECÍFICOS

Liste tickets que façam referência a casos particulares por cliente/franquia. Se não houver, omita a seção inteira.

No final, adicione:

## 📦 Resumo Final da Entrega

- Quantidade aproximada de bugs corrigidos
- Quantidade de melhorias
- Áreas mais impactadas
- Ajustes para clientes específicos
- Conclusão geral da entrega

---

### ESTILO DE REDAÇÃO (obrigatório):
- NÃO copie o título bruto do ticket.
- Reescreva cada item como frase objetiva de release notes.
- Bugs: comece com "Corrigido…", "Ajustado…" ou "Impedido…".
- Melhorias/Requisitos: comece com "Implementado…", "Adicionado…", "Incluído…" ou "Atualizado…".
- Remova ruído técnico (stack, JSON de erro, URL de print, "Uncaught TypeError" isolado), mantendo o efeito para o usuário.
- Exemplos:
  - Entrada: "[PDV WEB] Erro no console ''Uncaught TypeError'' ao finalizar venda."
  - Saída: "PDV Web: corrigido erro ao finalizar a venda. (Caso 96199)"
  - Entrada: "Incluir campos de Restrição de Idade e Hortifruti - parte 1"
  - Saída: "Incluídos os campos Restrição de Idade e Hortifruti no cadastro de produtos (Parte 1). (Caso 95989)"

### REGRAS DE CLASSIFICAÇÃO:
- BUG: correção de erro, falha, comportamento incorreto, regressão.
- MELHORIA: evolução de tela/fluxo/API já existente (filtros novos, tooltip, percentual de acréscimo, etc.).
- REQUISITO: funcionalidade nova de negócio pedida/entregue (quando não for só melhoria de UX).
- Um mesmo caso NÃO pode aparecer em mais de uma seção/subtópico.
- Não invente itens que não estejam nos dados fornecidos.

### FONTES DE DADOS (prioridade):
1. Se algum ticket tiver o campo "Conteúdo adicional / rascunho" preenchido e ele parecer um rascunho estruturado de release notes (com seções como Relatórios, Financeiro, Melhorias, etc.), USE-O COMO FONTE PREFERENCIAL para montar o documento — reescreva/polindo e complemente com os demais tickets da lista que ainda não estiverem cobertos.
2. Caso contrário, categorize e reescreva a partir de "Resumo" + "Módulo" de cada ticket.
3. Cite o número do caso entre parênteses ao final de cada linha quando houver correspondência clara. Se um item vier só do rascunho sem caso associado, pode omitir o número.

### IMPORTANTE:
- Responda SEMPRE em português brasileiro (pt-BR).
- Retorne APENAS o documento no formato acima, sem comentários adicionais antes ou depois.
- Se uma seção não tiver nenhum item, omita a seção inteira (não escreva "Não há…" / "Não aplicável").
- Use a lista de itens abaixo como fonte de dados para gerar o documento:

{{ticketsList}}'
WHERE NOT EXISTS (
  SELECT 1 FROM form_assistant_prompts
  WHERE tipo = 'RELEASE_NOTES' AND squad_setor IS NULL
);
