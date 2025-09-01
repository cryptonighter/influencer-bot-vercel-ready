/* ---------------------- */
/* Extensions */
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

/* ---------------------- */
/* Users table */
CREATE TABLE IF NOT EXISTS "users" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT,
  provider TEXT, -- now exists before index
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz,
  locale TEXT,
  timezone TEXT,
  is_test BOOLEAN DEFAULT FALSE,
  privacy_opt_out BOOLEAN DEFAULT FALSE,
  consent_given_at timestamptz,
  deleted_at timestamptz
);
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Ensure provider column exists (idempotent) */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='users' AND column_name='provider'
    ) THEN
        ALTER TABLE "users" ADD COLUMN provider TEXT;
    END IF;
END $$;

/* ---------------------- */
/* User profiles */
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  goals JSONB,
  attributes JSONB,
  version INT DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, version)
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Sessions */
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  channel TEXT,
  metadata JSONB
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Messages */
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('user','bot','system')) NOT NULL,
  channel_message_id TEXT,
  body TEXT,
  body_json JSONB,
  tokens INT,
  created_at timestamptz DEFAULT now(),
  sanitized BOOLEAN DEFAULT FALSE
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Conversation windows */
CREATE TABLE IF NOT EXISTS convo_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  window_data JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE convo_windows ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Embeddings */
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_meta JSONB,
  created_at timestamptz DEFAULT now(),
  source TEXT
);
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

/* Indexes for embeddings */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='embeddings_embedding_idx'
    ) THEN
        CREATE INDEX embeddings_embedding_idx ON embeddings USING ivfflat (embedding) WITH (lists=100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='embeddings_chunk_meta_idx'
    ) THEN
        CREATE INDEX embeddings_chunk_meta_idx ON embeddings USING gin (chunk_meta jsonb_path_ops);
    END IF;
END $$;

/* ---------------------- */
/* Content modules */
CREATE TABLE IF NOT EXISTS content_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  "type" TEXT CHECK ("type" IN ('course','coaching','tour','offer','article')) NOT NULL,
  metadata JSONB,
  body TEXT,
  published BOOLEAN DEFAULT FALSE,
  price_cents INT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
ALTER TABLE content_modules ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Content progress */
CREATE TABLE IF NOT EXISTS content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  content_module_id UUID REFERENCES content_modules(id) ON DELETE CASCADE,
  state JSONB,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at timestamptz,
  last_interaction timestamptz
);
ALTER TABLE content_progress ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Purchases & entitlements */
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  provider TEXT,
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
  granted_by TEXT,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  metadata JSONB
);
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Unique constraints */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='unique_user_content'
    ) THEN
        ALTER TABLE entitlements ADD CONSTRAINT unique_user_content UNIQUE (user_id, content_module_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='unique_message_source'
    ) THEN
        ALTER TABLE embeddings ADD CONSTRAINT unique_message_source UNIQUE (message_id, source);
    END IF;
END $$;

/* ---------------------- */
/* Offers & targeting */
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  content_module_id UUID REFERENCES content_modules(id),
  price_cents INT,
  active BOOLEAN DEFAULT TRUE,
  targeting JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS targeting_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES "users"(id),
  before JSONB,
  after JSONB,
  changed_at timestamptz DEFAULT now()
);
ALTER TABLE targeting_audit ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Audit logs */
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id),
  action TEXT,
  payload JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* GDPR */
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
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
  actor TEXT,
  purpose TEXT,
  object_table TEXT,
  object_id UUID,
  action TEXT,
  created_at timestamptz DEFAULT now(),
  metadata JSONB
);
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Data retention policies */
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  scope JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Model registry */
CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  dimension INT NOT NULL,
  provider TEXT,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;

INSERT INTO model_registry (model_name, dimension, provider, last_used_at) 
VALUES ('text-embedding-3-small', 1536, 'openai', NOW())
ON CONFLICT DO NOTHING;

/* ---------------------- */
/* Indexes */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_users_external_id') THEN
        CREATE INDEX idx_users_external_id ON "users"(external_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_users_external_provider') THEN
        CREATE INDEX idx_users_external_provider ON "users"(external_id, provider);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_messages_session_created') THEN
        CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_messages_user_created') THEN
        CREATE INDEX idx_messages_user_created ON messages(user_id, created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_embeddings_user_created') THEN
        CREATE INDEX idx_embeddings_user_created ON embeddings(user_id, created_at);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_sessions_user_started') THEN
        CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);
    END IF;
END $$;
