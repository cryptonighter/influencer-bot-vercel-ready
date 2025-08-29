-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector

-- Users: stable record of a person
CREATE TABLE "users" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,                -- telegram/whatsapp id, only for mapping
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz,
  locale TEXT,
  timezone TEXT,
  is_test BOOLEAN DEFAULT FALSE,
  privacy_opt_out BOOLEAN DEFAULT FALSE,   -- GDPR/CCPA consent flag
  consent_given_at timestamptz,            -- track explicit consent
  deleted_at timestamptz                     -- soft delete for right‑to‑be‑forgotten
);

-- User profile (separable so we can version/patch easily)
CREATE TABLE user_profiles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  goals JSONB,                -- structured goals/interests
  attributes JSONB,           -- arbitrary key/value (e.g., level: beginner)
  version INT DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, version)
);

-- Sessions (short‑lived interaction contexts)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  channel TEXT,               -- telegram/whatsapp/web
  metadata JSONB
);

-- Messages: append‑only log for each message in a session
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('user','bot','system')) NOT NULL,
  channel_message_id TEXT,    -- provider id
  body TEXT,
  body_json JSONB,
  tokens INT,
  created_at timestamptz DEFAULT now(),
  sanitized BOOLEAN DEFAULT FALSE
);

-- Conversation snapshots (optional): store short windows for fast retrieval
CREATE TABLE convo_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  window_data JSONB,          -- renamed from `window` (reserved keyword)
  created_at timestamptz DEFAULT now()
);

-- Embeddings table for unstructured memory; store vector + metadata
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(1536),               -- adjust dimension to model (e.g., 1536 for some models)
  chunk_meta JSONB,
  created_at timestamptz DEFAULT now(),
  source TEXT                           -- 'message' | 'reflection' | 'content_module'
);
CREATE INDEX ON embeddings USING ivfflat (embedding) WITH (lists = 100);
CREATE INDEX embeddings_chunk_meta_idx ON embeddings USING gin (chunk_meta jsonb_path_ops);

-- Content modules (courses, offers, modules)
CREATE TABLE content_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  "type" TEXT CHECK ("type" IN ('course','coaching','tour','offer','article')) NOT NULL,
  metadata JSONB,
  body TEXT,
  published BOOLEAN DEFAULT FALSE,
  price_cents INT,               -- nullable for free modules
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Content module state per user (progress + gating)
CREATE TABLE content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  state JSONB,                     -- e.g., {"current_step": 3, "completed": false}
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at timestamptz,
  last_interaction timestamptz
);

-- Purchases & entitlements
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT,                  -- stripe|telegram|whatsapp
  provider_payment_id TEXT,
  amount_cents BIGINT,
  currency TEXT,
  status TEXT CHECK (status IN ('pending','succeeded','failed','refunded')),
  purchased_at timestamptz DEFAULT now(),
  metadata JSONB
);

-- Entitlements (computed from purchases or admin grants)
CREATE TABLE entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  granted_by TEXT,                -- 'stripe'|'admin'|'promo'
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  metadata JSONB
);

-- Offers and targeting rules
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  content_module_id UUID REFERENCES content_modules(id),
  price_cents INT,
  active BOOLEAN DEFAULT TRUE,
  targeting JSONB,                -- e.g., {"min_level":"intermediate","goal":"weight_loss"}
  created_at timestamptz DEFAULT now()
);

-- Targeting rule audit: who changed what
CREATE TABLE targeting_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),   -- admin id
  before JSONB,
  after JSONB,
  changed_at timestamptz DEFAULT now()
);

-- Lightweight audit log for critical actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT,
  payload JSONB,
  created_at timestamptz DEFAULT now()
);

-- Retention control table (for GDPR / exports)
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  scope JSONB,                         -- example scope: {"tables":["messages","embeddings"],"keep_days":365}
  created_at timestamptz DEFAULT now()
);

-- Model registry for embedding model metadata
CREATE TABLE model_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  dimension INT NOT NULL,
  provider TEXT,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);