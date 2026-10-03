CREATE TABLE IF NOT EXISTS drying_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  spool_id uuid NOT NULL REFERENCES spools(id) ON DELETE CASCADE,
  user_id text,
  temperature_c integer NOT NULL,
  duration_minutes integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drying_events_spool_idx
  ON drying_events(spool_id, created_at DESC);
