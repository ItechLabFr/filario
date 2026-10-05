ALTER TABLE bambu_accounts
  ADD COLUMN IF NOT EXISTS cloud_user_id text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS telemetry jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS telemetry_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS bambu_devices_telemetry_idx
  ON bambu_devices(organization_id, telemetry_updated_at DESC);
