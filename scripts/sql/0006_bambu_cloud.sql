CREATE TABLE IF NOT EXISTS bambu_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  email text NOT NULL,
  region text NOT NULL DEFAULT 'global' CHECK (region IN ('global','china')),
  token_ciphertext text NOT NULL,
  token_iv text NOT NULL,
  token_tag text NOT NULL,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','error','disconnected')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, email, region)
);

CREATE INDEX IF NOT EXISTS bambu_accounts_org_idx
  ON bambu_accounts(organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS bambu_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES bambu_accounts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  dev_id text NOT NULL,
  name text NOT NULL,
  product_name text,
  model_name text,
  online boolean NOT NULL DEFAULT false,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, dev_id)
);

CREATE INDEX IF NOT EXISTS bambu_devices_org_idx
  ON bambu_devices(organization_id, updated_at DESC);

ALTER TABLE printers ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE printers ADD COLUMN IF NOT EXISTS integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS printers_external_idx
  ON printers(organization_id, integration_type, external_id);
