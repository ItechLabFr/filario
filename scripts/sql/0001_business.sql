CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','manager','member','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON memberships(user_id);

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS locations_org_idx ON locations(organization_id);

CREATE TABLE IF NOT EXISTS spools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  public_id text NOT NULL UNIQUE,
  manufacturer text NOT NULL,
  product_name text NOT NULL,
  material text NOT NULL,
  color_name text,
  color_hex text,
  diameter_mm numeric(4,2) NOT NULL DEFAULT 1.75,
  initial_weight_g integer NOT NULL DEFAULT 1000,
  remaining_weight_g integer NOT NULL DEFAULT 1000,
  spool_weight_g integer,
  density_g_cm3 numeric(6,3),
  nozzle_min_c integer,
  nozzle_max_c integer,
  bed_min_c integer,
  bed_max_c integer,
  drying_temp_c integer,
  purchase_price_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  lot_number text,
  external_source text,
  external_id text,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  opened_at timestamptz,
  purchased_at timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','empty','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spools_org_idx ON spools(organization_id);
CREATE INDEX IF NOT EXISTS spools_location_idx ON spools(location_id);
CREATE INDEX IF NOT EXISTS spools_material_idx ON spools(organization_id, material);

CREATE TABLE IF NOT EXISTS spool_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  spool_id uuid NOT NULL REFERENCES spools(id) ON DELETE CASCADE,
  user_id text,
  event_type text NOT NULL,
  quantity_g integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spool_events_spool_idx ON spool_events(spool_id, created_at DESC);

CREATE TABLE IF NOT EXISTS printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  manufacturer text,
  model text,
  integration_type text,
  integration_url text,
  status text NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS printers_org_idx ON printers(organization_id);

CREATE TABLE IF NOT EXISTS printer_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  printer_id uuid NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  name text NOT NULL,
  spool_id uuid REFERENCES spools(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(printer_id, name)
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS print_job_filaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  print_job_id uuid NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  spool_id uuid REFERENCES spools(id) ON DELETE SET NULL,
  planned_weight_g integer,
  actual_weight_g integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  reference text,
  total_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON audit_logs(organization_id, created_at DESC);
