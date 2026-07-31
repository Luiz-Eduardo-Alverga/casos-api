/**
 * Atualiza o prompt DEFAULT do tipo RELEASE_NOTES no banco.
 * Uso: npx tsx scripts/update-release-notes-prompt.ts
 */
import "dotenv/config";
import postgres from "postgres";
import { DEFAULT_RELEASE_NOTES_TEMPLATE } from "../prompts/release-notes.js";

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });

try {
  const updated = await client`
    UPDATE form_assistant_prompts
    SET template = ${DEFAULT_RELEASE_NOTES_TEMPLATE}, updated_at = now()
    WHERE tipo = 'RELEASE_NOTES' AND squad_setor IS NULL
    RETURNING id, name, tipo
  `;

  if (updated.length === 0) {
    const inserted = await client`
      INSERT INTO form_assistant_prompts (squad_setor, tipo, name, template)
      VALUES (NULL, 'RELEASE_NOTES', 'Prompt Padrão - Registro de Liberação', ${DEFAULT_RELEASE_NOTES_TEMPLATE})
      RETURNING id, name, tipo
    `;
    console.log(
      `Prompt DEFAULT RELEASE_NOTES criado: ${inserted[0].name} (${inserted[0].id})`,
    );
  } else {
    console.log(
      `Prompt DEFAULT RELEASE_NOTES atualizado: ${updated[0].name} (${updated[0].id})`,
    );
  }
} catch (error) {
  console.error("Erro ao atualizar prompt RELEASE_NOTES:", error);
  process.exit(1);
} finally {
  await client.end();
}
