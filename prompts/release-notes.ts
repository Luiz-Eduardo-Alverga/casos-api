/**
 * Montagem do prompt de geração do Registro de Liberação.
 *
 * O template editável vem do banco (form_assistant_prompts, tipo RELEASE_NOTES —
 * ver db/migrations/003_add_prompt_tipo.sql) e contém os placeholders
 * {{produto}}, {{versoes}} e {{ticketsList}}, injetados aqui em runtime.
 */

import type { ReleaseNotesTicket } from "../types/release-notes.js";

/**
 * Fallback hardcoded, usado apenas se o banco estiver vazio/indisponível.
 * Deve estar em sincronia com o seed/template DEFAULT do tipo RELEASE_NOTES no banco.
 */
export const DEFAULT_RELEASE_NOTES_TEMPLATE = `Você é um especialista em documentação técnica de liberações de software (Release Notes). Sua tarefa é gerar um Registro de Liberação – Hotfix no MESMO formato abaixo, categorizando automaticamente os tickets conforme o conteúdo.

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
  - Entrada: "[PDV WEB] Erro no console 'Uncaught TypeError' ao finalizar venda."
  - Saída: "PDV Web: corrigido erro ao finalizar a venda. (Caso 96199)"
  - Entrada: "Incluir campos de Restrição de Idade e Hortifruti - parte 1"
  - Saída: "Incluídos os campos Restrição de Idade e Hortifruti no cadastro de produtos (Parte 1). (Caso 95989)"

### REGRAS DE CLASSIFICAÇÃO:
- BUG: correção de erro, falha, comportamento incorreto, regressão.
- MELHORIA: evolução de tela/fluxo/API já existente (filtros novos, tooltip, percentual de acréscimo, endpoint novo, etc.).
- REQUISITO: funcionalidade nova de negócio pedida/entregue (quando não for só melhoria de UX).
- Um mesmo caso NÃO pode aparecer em mais de uma seção/subtópico.
- Não invente itens que não estejam nos dados fornecidos.

### FONTES DE DADOS (prioridade absoluta):
1. Se existir o bloco "## RASCUNHO PREFERENCIAL" abaixo, ele é a FONTE PRINCIPAL do documento.
2. REGRA CRÍTICA DE COBERTURA: NENHUMA linha/item desse rascunho pode ser omitida no documento final. Cada bullet/linha do rascunho deve aparecer (reescrito/polido) em alguma seção adequada (Bugs, Melhorias, Requisitos ou Clientes).
3. Itens que existem SÓ no rascunho (sem caso correspondente na lista de tickets) DEVEM entrar no documento mesmo assim — omita o "(Caso X)" se não houver match claro.
4. A lista de tickets individuais serve para COMPLEMENTAR o que o rascunho não cobrir (ou para associar números de caso), NÃO para substituir o rascunho.
5. Se NÃO houver rascunho preferencial, categorize e reescreva a partir de "Resumo" + "Módulo" de cada ticket.
6. Cite o número do caso entre parênteses ao final da linha quando houver correspondência clara.

### IMPORTANTE:
- Responda SEMPRE em português brasileiro (pt-BR).
- Retorne APENAS o documento no formato acima, sem comentários adicionais antes ou depois.
- Se uma seção não tiver nenhum item, omita a seção inteira (não escreva "Não há…" / "Não aplicável").
- Antes de finalizar, faça uma checagem mental: se o rascunho tinha N itens, o documento final deve cobrir esses N itens (mais os tickets extras não cobertos).
- Use os dados abaixo para gerar o documento:

{{ticketsList}}`;

/** Heurística: texto longo com seções típicas de release notes. */
function looksLikeReleaseDraft(text: string): boolean {
  const normalized = text.toLowerCase();
  const sectionHits = [
    "relatórios",
    "relatorios",
    "financeiro",
    "compras",
    "vendas",
    "endpoints",
    "melhorias",
    "configurações",
    "configuracoes",
    "produtos",
    "interface",
    "fiscal",
    "corrigido",
    "implementada",
    "implementado",
  ].filter((kw) => normalized.includes(kw)).length;

  return text.length >= 200 && sectionHits >= 3;
}

function extractPreferentialDrafts(tickets: ReleaseNotesTicket[]): Array<{
  casoId: number;
  draft: string;
}> {
  return tickets
    .filter(
      (t) =>
        t.passosParaReproduzir &&
        looksLikeReleaseDraft(t.passosParaReproduzir),
    )
    .map((t) => ({
      casoId: t.casoId,
      draft: t.passosParaReproduzir as string,
    }));
}

function formatTicketsList(tickets: ReleaseNotesTicket[]): string {
  const drafts = extractPreferentialDrafts(tickets);
  const draftCaseIds = new Set(drafts.map((d) => d.casoId));

  const parts: string[] = [];

  if (drafts.length > 0) {
    const draftBlocks = drafts
      .map(
        (d) =>
          `### Rascunho do Caso ${d.casoId}\n` +
          `IMPORTANTE: preserve TODOS os itens abaixo no documento final.\n\n` +
          d.draft,
      )
      .join("\n\n---\n\n");

    parts.push(
      `## RASCUNHO PREFERENCIAL\n` +
        `Este bloco é a fonte principal. Não omita nenhum item/linha dele.\n\n` +
        draftBlocks,
    );
  }

  const ticketBlocks = tickets
    .map((t) => {
      const modulo = t.modulo?.trim() || "Não informado";
      const lines = [
        `### Caso ${t.casoId}`,
        `- Módulo: ${modulo}`,
        `- Resumo: ${t.descricaoResumo}`,
      ];

      // Evita duplicar o rascunho já colocado no bloco preferencial
      if (t.passosParaReproduzir && !draftCaseIds.has(t.casoId)) {
        lines.push(
          `- Conteúdo adicional / rascunho:\n${t.passosParaReproduzir}`,
        );
      } else if (draftCaseIds.has(t.casoId)) {
        lines.push(
          `- Observação: o rascunho estruturado deste caso está no bloco RASCUNHO PREFERENCIAL acima.`,
        );
      }

      return lines.join("\n");
    })
    .join("\n\n");

  parts.push(`## TICKETS INDIVIDUAIS\n\n${ticketBlocks}`);

  return parts.join("\n\n");
}

/**
 * Monta o prompt final injetando os dados dinâmicos (produto, versões e a lista
 * de tickets curados) nos placeholders do template editável (vindo do banco ou fallback).
 */
export function buildReleaseNotesPrompt(
  editableTemplate: string,
  produto: string,
  versoes: string[],
  tickets: ReleaseNotesTicket[],
): string {
  return editableTemplate
    .replace("{{produto}}", produto || "Não identificado")
    .replace("{{versoes}}", versoes.join(", ") || "Não identificada")
    .replace("{{ticketsList}}", formatTicketsList(tickets));
}
