/* ---------------------- */
/* User Interests */
/* For tracking and testing user interests for targeted interactions */
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  interest_type TEXT,  -- e.g., "career", "relationships"
  score INT DEFAULT 0,  -- Confidence or engagement score
  metadata JSONB,  -- Additional data like sources, timestamps
  validated_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

/* Indexes */
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_interests_user') THEN
        CREATE INDEX idx_user_interests_user ON user_interests(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_user_interests_type') THEN
        CREATE INDEX idx_user_interests_type ON user_interests(interest_type);
    END IF;
END $$;