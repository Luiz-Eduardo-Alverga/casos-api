import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { FiltroResumoItem } from "../interfaces/schema";

/** Valores além de `not_started` devem espelhar o `CREATE TYPE ... AS ENUM` do banco. */
export const statusTypeEnum = pgEnum("status_type", [
  "Em desenvolvimento",
  "Em teste",
  "Em homologação",
  "Em certificação",
  "Concluído",
]);

export const acquirers = pgTable("acquirers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  has4g: boolean("has_4g").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const versions = pgTable("versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
});

export const acquirerStatus = pgTable("acquirer_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  acquirerId: uuid("acquirer_id")
    .notNull()
    .references(() => acquirers.id),
  status: statusTypeEnum("status").notNull().default("Em homologação"),
  currentVersionId: uuid("current_version_id")
    .notNull()
    .references(() => versions.id),
  nextVersionId: uuid("next_version_id").references(() => versions.id),
  deliveryDate: date("delivery_date"),
  recommendedDeviceId: uuid("recommended_device_id").references(
    () => devices.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  sortOrder: integer("sort_order").default(999),
  isActive: boolean("is_active").notNull().default(true),
  obs: text("obs"),
});

export const acquirerCompatibleDevices = pgTable(
  "acquirer_compatible_devices",
  {
    statusId: uuid("status_id")
      .notNull()
      .references(() => acquirerStatus.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id),
    androidVersion: text("android_version"),
  },
  (t) => [
    primaryKey({
      columns: [t.statusId, t.deviceId],
      name: "acquirer_compatible_devices_pkey",
    }),
  ],
);

/** Usuário espelhado da Soft Flow (fonte de identidade: `legacy_user_id`). */
export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  legacyUserId: integer("legacy_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  nome: text("nome").notNull(),
  setor: text("setor").notNull(),
  usuarioGrupoId: text("usuario_grupo_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/** Módulo/categoria para agrupar permissões na UI (matriz por papel). */
export const permissionModules = pgTable("permission_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => permissionModules.id, { onDelete: "restrict" }),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  /** Menor valor = mais autoridade (1 = topo). Usado na delegação de perfis. */
  hierarchyLevel: integer("hierarchy_level").notNull().default(999),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      columns: [t.roleId, t.permissionId],
      name: "role_permissions_pkey",
    }),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      columns: [t.userId, t.roleId],
      name: "user_roles_pkey",
    }),
  ],
);

/** Preferências de filtros resumidos por usuário (visão colapsada do card de filtros de casos). */
export const userCasesFiltersPreferences = pgTable(
  "user_cases_filters_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .primaryKey()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    filtrosResumo: jsonb("filtros_resumo")
      .$type<FiltroResumoItem[]>()
      .notNull()
      .default([
        { field: "produto", colSpan: 1 },
        { field: "versao", colSpan: 1 },
        { field: "status_ids", colSpan: 2 },
      ]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

/**
 * Prompt de IA cadastrável em banco, compartilhado entre múltiplos recursos.
 * O campo `tipo` diferencia o uso: "FORM_ASSISTANT" (abertura de caso, 1 prompt
 * por squad) ou "RELEASE_NOTES" (Registro de Liberação, N prompts por squad —
 * a seleção de qual usar é feita pelo cliente via promptId).
 */
export const formAssistantPrompts = pgTable("form_assistant_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** null = prompt DEFAULT global; preenchido = exclusivo do squad */
  squadSetor: text("squad_setor"),
  /** "FORM_ASSISTANT" (default) | "RELEASE_NOTES". Unicidade por squad só é aplicada a FORM_ASSISTANT (ver migration 003). */
  tipo: text("tipo").notNull().default("FORM_ASSISTANT"),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  template: text("template").notNull(),
  createdBy: uuid("created_by").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  updatedBy: uuid("updated_by").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/** Metadados de anexos de caso (arquivos no Supabase Storage; `caso_registro` = ID na API externa). */
export const caseAttachments = pgTable(
  "case_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    casoRegistro: integer("caso_registro").notNull(),
    bucket: text("bucket").notNull().default("casos-anexos"),
    path: text("path").notNull().unique(),
    filenameOriginal: text("filename_original").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    kind: text("kind").notNull(),
    createdBy: uuid("created_by").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("case_attachments_caso_registro_idx").on(t.casoRegistro)],
);
