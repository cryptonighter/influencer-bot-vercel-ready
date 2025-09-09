/* ---------------------- */
/* Conversation Logs */
/* For storing summaries, topics, and facts from conversations */
CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  summary TEXT,
  topics JSONB,  -- e.g., ["career", "relationships"]
  facts JSONB,   -- e.g., {"name": "John", "location": "NYC", "ambitions": "Start a business"}
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

/* Indexes */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_conversation_logs_user') THEN
        CREATE INDEX idx_conversation_logs_user ON conversation_logs(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_conversation_logs_session') THEN
        CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
    END IF;
END $$;