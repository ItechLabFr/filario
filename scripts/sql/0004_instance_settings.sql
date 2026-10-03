CREATE TABLE IF NOT EXISTS filario_instance_settings (
  id smallint PRIMARY KEY CHECK (id = 1),
  admin_user_id text,
  allow_registration boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO filario_instance_settings (id, allow_registration)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

UPDATE filario_instance_settings
SET
  admin_user_id = (
    SELECT id
    FROM "user"
    ORDER BY "createdAt" ASC
    LIMIT 1
  ),
  updated_at = now()
WHERE id = 1
  AND admin_user_id IS NULL
  AND EXISTS (SELECT 1 FROM "user");
