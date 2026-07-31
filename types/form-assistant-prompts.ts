/**
 * Tipos para gerenciamento de prompts de IA cadastráveis em banco.
 */

/**
 * Diferencia o uso do prompt dentro da mesma tabela:
 * - "FORM_ASSISTANT": abertura de caso. 1 prompt por squad (resolução automática via squadSetor).
 * - "RELEASE_NOTES": Registro de Liberação. N prompts por squad; o cliente escolhe qual usar via promptId.
 */
export type PromptType = "FORM_ASSISTANT" | "RELEASE_NOTES";

export interface FormAssistantPrompt {
  id: string;
  /** null = prompt DEFAULT global; preenchido = exclusivo do squad */
  squadSetor: string | null;
  tipo: PromptType;
  name: string;
  isActive: boolean;
  /** Parte editável do prompt (regras do Squad). Blocos fixos são montados pelo backend. */
  template: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreatePromptBody {
  /**
   * Para tipo "FORM_ASSISTANT": obrigatório e deve começar com "SQUAD" (1 prompt por squad).
   * Para tipo "RELEASE_NOTES": opcional (permite prompts globais além do DEFAULT); se informado, deve começar com "SQUAD".
   */
  squadSetor?: string;
  /** Default "FORM_ASSISTANT" quando omitido, para manter compatibilidade com clientes atuais. */
  tipo?: PromptType;
  name: string;
  /** Regras editáveis do Squad (comportamento, formatos de description por categoria, ou template de Registro de Liberação). */
  template: string;
}

export interface UpdatePromptBody {
  name?: string;
  /** Regras editáveis do Squad (comportamento, formatos de description por categoria). */
  template?: string;
}

export interface ResolvedPromptData extends Omit<FormAssistantPrompt, "createdBy" | "updatedBy"> {
  /** true quando o prompt retornado é o DEFAULT (squad não tem prompt próprio ou setor não é squad). */
  isDefault: boolean;
}
