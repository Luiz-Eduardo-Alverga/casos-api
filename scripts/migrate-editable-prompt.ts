/**
 * Atualiza o prompt DEFAULT no banco para conter apenas a parte editável.
 * Uso: npx tsx scripts/migrate-editable-prompt.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { DEFAULT_EDITABLE_TEMPLATE } from "../prompts/form-assistant.js";

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });

try {
  const updated = await client`
    UPDATE form_assistant_prompts
    SET template = ${DEFAULT_EDITABLE_TEMPLATE}, updated_at = now()
    WHERE squad_setor IS NULL
    RETURNING id, name
  `;

  if (updated.length === 0) {
    console.log("Nenhum prompt DEFAULT encontrado para atualizar.");
  } else {
    console.log(`Prompt DEFAULT atualizado: ${updated[0].name} (${updated[0].id})`);
  }

  const squadRows = await client`
    SELECT id, squad_setor, length(template) AS len
    FROM form_assistant_prompts
    WHERE squad_setor IS NOT NULL
  `;

  if (squadRows.length > 0) {
    console.log(
      `${squadRows.length} prompt(s) de squad no banco — blocos fixos legados serão ignorados em runtime automaticamente.`,
    );
  }
} catch (error) {
  console.error("Erro na migration:", error);
  process.exit(1);
} finally {
  await client.end();
}
