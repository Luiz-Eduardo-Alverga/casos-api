import type {
  ReleaseNotesTicket,
  SoftFlowLiberacaoItem,
} from "../types/release-notes.js";

/**
 * Cura os campos relevantes de cada item retornado pela Softflow para a geração
 * do documento via IA. Analisa todos os itens do liberacaoId.
 * Inclui `passos_para_reproduzir` quando existir — pode conter rascunho estruturado.
 */
export function extractTickets(
  items: SoftFlowLiberacaoItem[],
): ReleaseNotesTicket[] {
  return items.map((item) => ({
    casoId: item.caso_id,
    produto: item.nome_produto,
    versao: item.versao,
    modulo: item.modulo,
    descricaoResumo: item.descricao_resumo,
    passosParaReproduzir: item.passos_para_reproduzir?.trim() || null,
  }));
}

/**
 * Resolve o(s) produto(s) e a(s) versão(ões) distintos presentes nos tickets,
 * usados para montar o cabeçalho do Registro de Liberação.
 */
export function resolveProdutoEVersoes(tickets: ReleaseNotesTicket[]): {
  produto: string;
  versoes: string[];
} {
  const produtos = Array.from(new Set(tickets.map((t) => t.produto))).filter(
    Boolean,
  );
  const versoes = Array.from(new Set(tickets.map((t) => t.versao))).filter(
    Boolean,
  );

  return {
    produto: produtos.join(" / "),
    versoes,
  };
}
