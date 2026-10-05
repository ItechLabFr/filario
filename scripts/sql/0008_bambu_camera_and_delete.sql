ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS ignored boolean NOT NULL DEFAULT false;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS access_code_ciphertext text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS access_code_iv text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS access_code_tag text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS camera_host text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS camera_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS camera_cert_fingerprint text;

ALTER TABLE bambu_devices
  ADD COLUMN IF NOT EXISTS camera_last_error text;

CREATE INDEX IF NOT EXISTS bambu_devices_visible_idx
  ON bambu_devices(organization_id, ignored, updated_at DESC);
