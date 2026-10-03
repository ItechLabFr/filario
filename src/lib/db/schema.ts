import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
  uniqueIndex,
  index
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId),
  index("memberships_user_idx").on(t.userId)
]);

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("locations_org_idx").on(t.organizationId)]);

export const spools = pgTable("spools", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  publicId: text("public_id").notNull().unique(),
  manufacturer: text("manufacturer").notNull(),
  productName: text("product_name").notNull(),
  material: text("material").notNull(),
  colorName: text("color_name"),
  colorHex: text("color_hex"),
  diameterMm: numeric("diameter_mm", { precision: 4, scale: 2 }).notNull().default("1.75"),
  initialWeightG: integer("initial_weight_g").notNull().default(1000),
  remainingWeightG: integer("remaining_weight_g").notNull().default(1000),
  spoolWeightG: integer("spool_weight_g"),
  densityGCm3: numeric("density_g_cm3", { precision: 6, scale: 3 }),
  nozzleMinC: integer("nozzle_min_c"),
  nozzleMaxC: integer("nozzle_max_c"),
  bedMinC: integer("bed_min_c"),
  bedMaxC: integer("bed_max_c"),
  dryingTempC: integer("drying_temp_c"),
  purchasePriceCents: integer("purchase_price_cents"),
  currency: text("currency").notNull().default("EUR"),
  lotNumber: text("lot_number"),
  externalSource: text("external_source"),
  externalId: text("external_id"),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("spools_org_idx").on(t.organizationId),
  index("spools_location_idx").on(t.locationId),
  index("spools_material_idx").on(t.organizationId, t.material)
]);

export const spoolEvents = pgTable("spool_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  spoolId: uuid("spool_id").notNull().references(() => spools.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  eventType: text("event_type").notNull(),
  quantityG: integer("quantity_g"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("spool_events_spool_idx").on(t.spoolId, t.createdAt)]);

export const printers = pgTable("printers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  integrationType: text("integration_type"),
  integrationUrl: text("integration_url"),
  status: text("status").notNull().default("idle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [index("printers_org_idx").on(t.organizationId)]);

export const printerSlots = pgTable("printer_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  printerId: uuid("printer_id").notNull().references(() => printers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  spoolId: uuid("spool_id").references(() => spools.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [uniqueIndex("printer_slots_printer_name_uq").on(t.printerId, t.name)]);

export const printJobs = pgTable("print_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  printerId: uuid("printer_id").references(() => printers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("planned"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const printJobFilaments = pgTable("print_job_filaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  printJobId: uuid("print_job_id").notNull().references(() => printJobs.id, { onDelete: "cascade" }),
  spoolId: uuid("spool_id").references(() => spools.id, { onDelete: "set null" }),
  plannedWeightG: integer("planned_weight_g"),
  actualWeightG: integer("actual_weight_g"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  website: text("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  reference: text("reference"),
  totalCents: integer("total_cents"),
  currency: text("currency").notNull().default("EUR"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});


export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id"),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("api_keys_org_idx").on(t.organizationId, t.createdAt)
]);


export const dryingEvents = pgTable("drying_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  spoolId: uuid("spool_id").notNull().references(() => spools.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  temperatureC: integer("temperature_c").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("drying_events_spool_idx").on(t.spoolId, t.createdAt)
]);


export const makerProfiles = pgTable("maker_profiles", {
  userId: text("user_id").primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  websiteUrl: text("website_url"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("maker_profiles_public_idx").on(t.isPublic, t.handle)
]);

export const publishedModels = pgTable("published_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  license: text("license").notNull().default("All rights reserved"),
  visibility: text("visibility").notNull().default("private"),
  fileName: text("file_name").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  sourceType: text("source_type").notNull().default("3mf"),
  profileMetadata: jsonb("profile_metadata").notNull().default({}),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  index("published_models_owner_idx").on(t.ownerUserId, t.createdAt),
  index("published_models_public_idx").on(t.visibility, t.createdAt)
]);

export const modelCollections = pgTable("model_collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("model_collections_owner_slug_uq").on(t.ownerUserId, t.slug)
]);

export const modelCollectionItems = pgTable("model_collection_items", {
  collectionId: uuid("collection_id").notNull().references(() => modelCollections.id, { onDelete: "cascade" }),
  modelId: uuid("model_id").notNull().references(() => publishedModels.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("model_collection_items_pk").on(t.collectionId, t.modelId)
]);
