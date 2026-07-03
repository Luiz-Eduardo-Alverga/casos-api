/**
 * Tipos para gerenciamento de prompts do assistente de IA por Squad.
 */

export interface FormAssistantPrompt {
  id: string;
  /** null = prompt DEFAULT global; preenchido = exclusivo do squad */
  squadSetor: string | null;
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
  /** Deve começar com "SQUAD". Não é permitido criar prompt para outros setores. */
  squadSetor: string;
  name: string;
  /** Regras editáveis do Squad (comportamento, formatos de description por categoria). */
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
