import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Cliente postgres raw com prepared statements desativados.
 * Necessário para o Supabase PgBouncer em transaction mode (porta 6543).
 * O `import "dotenv/config"` garante que DATABASE_URL esteja disponível
 * mesmo quando este módulo é carregado antes do dotenv.config() do server.ts
 * (comportamento de ESM com imports estáticos hoistados).
 */
export const sql = postgres(process.env.DATABASE_URL as string, {
  prepare: false,
});

// Mantém a instância drizzle para uso de tipos e schema
export const db = drizzle({ client: sql });
