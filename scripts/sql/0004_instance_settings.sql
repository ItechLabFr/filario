CREATE TABLE IF NOT EXISTS filario_instance_settings (
  id smallint PRIMARY KEY CHECK (id = 1),
  admin_user_id text,
  allow_registration boolean NOT NULL DEFAULT false,
  enforce_registration_policy boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO filario_instance_settings (id, allow_registration, enforce_registration_policy)
VALUES (1, false, true)
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

CREATE OR REPLACE FUNCTION filario_guard_user_registration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  settings filario_instance_settings%ROWTYPE;
BEGIN
  SELECT *
  INTO settings
  FROM filario_instance_settings
  WHERE id = 1
  FOR UPDATE;

  IF NOT settings.enforce_registration_policy THEN
    RETURN NEW;
  END IF;

  IF settings.admin_user_id IS NULL THEN
    UPDATE filario_instance_settings
    SET
      admin_user_id = NEW.id,
      allow_registration = false,
      updated_at = now()
    WHERE id = 1;

    RETURN NEW;
  END IF;

  IF settings.allow_registration THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'FILARIO_REGISTRATION_DISABLED'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS filario_user_registration_guard ON "user";

CREATE TRIGGER filario_user_registration_guard
BEFORE INSERT ON "user"
FOR EACH ROW
EXECUTE FUNCTION filario_guard_user_registration();
