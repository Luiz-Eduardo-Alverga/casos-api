import { sql } from "../db/index.js";
import { DEFAULT_EDITABLE_TEMPLATE } from "../prompts/form-assistant.js";
import type {
  FormAssistantPrompt,
  CreatePromptBody,
  UpdatePromptBody,
} from "../types/form-assistant-prompts.js";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/** Mapeamento de row do banco para o tipo FormAssistantPrompt */
function rowToModel(row: Record<string, unknown>): FormAssistantPrompt {
  return {
    id: row.id as string,
    squadSetor: row.squad_setor as string | null,
    name: row.name as string,
    isActive: row.is_active as boolean,
    template: row.template as string,
    createdBy: row.created_by as string | null,
    updatedBy: row.updated_by as string | null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
  };
}

export class PromptRepository {
  private cache: FormAssistantPrompt[] | null = null;
  private cacheLoadedAt: number | null = null;

  private isCacheValid(): boolean {
    return (
      this.cache !== null &&
      this.cacheLoadedAt !== null &&
      Date.now() - this.cacheLoadedAt < CACHE_TTL_MS
    );
  }

  invalidateCache(): void {
    this.cache = null;
    this.cacheLoadedAt = null;
  }

  private async loadAll(): Promise<FormAssistantPrompt[]> {
    if (this.isCacheValid()) return this.cache!;

    const rows = await sql<Record<string, unknown>[]>`
      SELECT id, squad_setor, name, is_active, template, created_by, updated_by, created_at, updated_at
      FROM form_assistant_prompts
      ORDER BY squad_setor NULLS FIRST
    `;

    this.cache = rows.map(rowToModel);
    this.cacheLoadedAt = Date.now();
    return this.cache;
  }

  async findAll(): Promise<FormAssistantPrompt[]> {
    return this.loadAll();
  }

  async findById(id: string): Promise<FormAssistantPrompt | null> {
    const all = await this.loadAll();
    return all.find((p) => p.id === id) ?? null;
  }

  async findDefault(): Promise<FormAssistantPrompt | null> {
    const all = await this.loadAll();
    return all.find((p) => p.squadSetor === null && p.isActive) ?? null;
  }

  async findBySquad(setor: string): Promise<FormAssistantPrompt | null> {
    const all = await this.loadAll();
    return all.find((p) => p.squadSetor === setor && p.isActive) ?? null;
  }

  /**
   * Resolve o template editável correto para o setor informado:
   * 1. Se setor começa com "SQUAD" e existe prompt ativo para ele → usa o do squad
   * 2. Caso contrário → usa o DEFAULT (squad_setor IS NULL)
   * 3. Se o banco estiver vazio → usa fallback hardcoded
   *
   * Retorna apenas a parte editável; blocos fixos são montados em buildFormAssistantPrompt.
   */
  async resolve(squadSetor?: string | null): Promise<string> {
    const isSquad = squadSetor?.startsWith("SQUAD") ?? false;

    if (isSquad && squadSetor) {
      const squadPrompt = await this.findBySquad(squadSetor);
      if (squadPrompt) return squadPrompt.template;
    }

    const defaultPrompt = await this.findDefault();
    return defaultPrompt?.template ?? DEFAULT_EDITABLE_TEMPLATE;
  }

  async create(data: CreatePromptBody): Promise<FormAssistantPrompt> {
    const rows = await sql<Record<string, unknown>[]>`
      INSERT INTO form_assistant_prompts (squad_setor, name, template)
      VALUES (${data.squadSetor}, ${data.name}, ${data.template})
      RETURNING id, squad_setor, name, is_active, template, created_by, updated_by, created_at, updated_at
    `;
    this.invalidateCache();
    return rowToModel(rows[0]);
  }

  async update(
    id: string,
    data: UpdatePromptBody,
    updatedBy?: string,
  ): Promise<FormAssistantPrompt | null> {
    // Busca atual para aplicar apenas os campos fornecidos (patch parcial)
    const current = await this.findById(id);
    if (!current) return null;

    const newName = data.name ?? current.name;
    const newTemplate = data.template ?? current.template;
    const newUpdatedBy = updatedBy ?? current.updatedBy;

    const rows = await sql<Record<string, unknown>[]>`
      UPDATE form_assistant_prompts
      SET name = ${newName},
          template = ${newTemplate},
          updated_by = ${newUpdatedBy},
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, squad_setor, name, is_active, template, created_by, updated_by, created_at, updated_at
    `;

    if (rows.length === 0) return null;
    this.invalidateCache();
    return rowToModel(rows[0]);
  }

  async toggleActive(id: string): Promise<FormAssistantPrompt | null> {
    const rows = await sql<Record<string, unknown>[]>`
      UPDATE form_assistant_prompts
      SET is_active = NOT is_active, updated_at = now()
      WHERE id = ${id}
      RETURNING id, squad_setor, name, is_active, template, created_by, updated_by, created_at, updated_at
    `;
    if (rows.length === 0) return null;
    this.invalidateCache();
    return rowToModel(rows[0]);
  }

  async remove(id: string): Promise<boolean> {
    const rows = await sql<Record<string, unknown>[]>`
      DELETE FROM form_assistant_prompts
      WHERE id = ${id} AND squad_setor IS NOT NULL
      RETURNING id
    `;
    if (rows.length === 0) return false;
    this.invalidateCache();
    return true;
  }
}

// Singleton compartilhado entre AIService e rotas
export const promptRepository = new PromptRepository();
