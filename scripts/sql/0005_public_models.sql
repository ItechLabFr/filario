CREATE TABLE IF NOT EXISTS maker_profiles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  website_url text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$')
);

CREATE INDEX IF NOT EXISTS maker_profiles_public_idx
  ON maker_profiles(is_public, handle);

CREATE TABLE IF NOT EXISTS published_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  license text NOT NULL DEFAULT 'All rights reserved',
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public','unlisted')),
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  source_type text NOT NULL DEFAULT '3mf',
  profile_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  download_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS published_models_owner_idx
  ON published_models(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS published_models_public_idx
  ON published_models(visibility, created_at DESC);

CREATE TABLE IF NOT EXISTS model_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, slug)
);

CREATE TABLE IF NOT EXISTS model_collection_items (
  collection_id uuid NOT NULL REFERENCES model_collections(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES published_models(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(collection_id, model_id)
);
