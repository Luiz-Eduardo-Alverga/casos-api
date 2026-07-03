export type CasoFiltroField =
  | "produto"
  | "versao"
  | "status_ids"
  | "modulo"
  | "categoria"
  | "projeto_id"
  | "tipo_abertura"
  | "descricao_resumo"
  | "usuario_abertura_id"
  | "devAtribuido"
  | "qaAtribuido"
  | "data_producao_inicio"
  | "data_producao_fim";

/** Um filtro selecionado pelo usuário para exibição na visão resumida, com seu colSpan na grid de 5 colunas. */
export interface FiltroResumoItem {
  field: CasoFiltroField;
  colSpan: 1 | 2;
}
