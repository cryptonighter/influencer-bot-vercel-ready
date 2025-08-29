/* Idempotent schema creation for the project */

-- Enable extensions (already safe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector

-- Users: stable record of a person
CREATE TABLE IF NOT EXISTS "users" (
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
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- User profile (separable so we can version/patch easily)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
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
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Sessions (short‑lived interaction contexts)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  channel TEXT,               -- telegram/whatsapp/web
  metadata JSONB
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Messages: append‑only log for each message in a session
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('user','bot','system')) NOT NULL,
  channel_message_id TEXT,    -- provider id
  body TEXT,
  body_json JSONB,
  tokens INT,
  created_at timestamptz DEFAULT now(),
  sanitized BOOLEAN DEFAULT FALSE
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversation snapshots (optional): store short windows for fast retrieval
CREATE TABLE IF NOT EXISTS convo_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  window_data JSONB,          -- renamed from `window` (reserved keyword)
  created_at timestamptz DEFAULT now()
);
ALTER TABLE convo_windows ENABLE ROW LEVEL SECURITY;

-- Embeddings table for unstructured memory; store vector + metadata
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(1536),               -- adjust dimension to model (e.g., 1536 for some models)
  chunk_meta JSONB,
  created_at timestamptz DEFAULT now(),
  source TEXT                           -- 'message' | 'reflection' | 'content_module'
);
-- Indexes for vector search and JSONB metadata (use IF NOT EXISTS where supported)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'embeddings_embedding_idx') THEN
        CREATE INDEX embeddings_embedding_idx ON embeddings USING ivfflat (embedding) WITH (lists = 100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'embeddings_chunk_meta_idx') THEN
        CREATE INDEX embeddings_chunk_meta_idx ON embeddings USING gin (chunk_meta jsonb_path_ops);
    END IF;
END $$;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Content modules (courses, offers, modules)
CREATE TABLE IF NOT EXISTS content_modules (
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
ALTER TABLE content_modules ENABLE ROW LEVEL SECURITY;

-- Content module state per user (progress + gating)
CREATE TABLE IF NOT EXISTS content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  content_module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  state JSONB,                     -- e.g., {"current_step": 3, "completed": false}
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at timestamptz,
  last_interaction timestamptz
);
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

-- Purchases & entitlements
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  provider TEXT,                  -- stripe|telegram|whatsapp
  provider_payment_id TEXT,
  amount_cents BIGINT,
  currency TEXT,
  status TEXT CHECK (status IN ('pending','succeeded','failed','refunded')),
  purchased_at timestamptz DEFAULT now(),
  metadata JSONB
);
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  content_module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  granted_by TEXT,                -- 'stripe'|'admin'|'promo'
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  metadata JSONB
);
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Offers and targeting rules
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  content_module_id UUID REFERENCES content_modules(id),
  price_cents INT,
  active BOOLEAN DEFAULT TRUE,
  targeting JSONB,                -- e.g., {"min_level":"intermediate","goal":"weight_loss"}
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Targeting rule audit: who changed what
CREATE TABLE IF NOT EXISTS targeting_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES "users"(id),   -- admin id
  before JSONB,
  after JSONB,
  changed_at timestamptz DEFAULT now()
);
ALTER TABLE targeting_audit ENABLE ROW LEVEL SECURITY;

-- Lightweight audit log for critical actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id),
  action TEXT,
  payload JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Retention control table (for GDPR / exports)
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  scope JSONB,                         -- e.g., {"tables":["messages","embeddings"],"keep_days":365}
  created_at timestamptz DEFAULT now()
);
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Model registry for embedding model metadata
CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  dimension INT NOT NULL,
  provider TEXT,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;

-- GDPR‑related tables (only create if missing)
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,      -- 'data_processing', 'marketing', 'analytics'
  granted BOOLEAN NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS dsr_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id),
  request_type TEXT CHECK (request_type IN ('export','delete','access','rectify')),
  status TEXT CHECK (status IN ('pending','processing','completed','rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  result_location TEXT,
  metadata JSONB
);
ALTER TABLE dsr_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id),
  actor TEXT,               -- who accessed the data
  purpose TEXT,             -- why the data was accessed
  object_table TEXT,        -- which table
  object_id UUID,           -- which record
  action TEXT,              -- 'read', 'write', 'delete'
  created_at timestamptz DEFAULT now(),
  metadata JSONB
);
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for frequently queried columns (created only if they don’t exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_users_external_id') THEN
        CREATE INDEX idx_users_external_id ON "users" (external_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_messages_session_created') THEN
        CREATE INDEX idx_messages_session_created ON messages (session_id, created_at);
    END IF;
END $$;

/* End of idempotent schema creation */
