/* ---------------------- */
/* Partners Table */
/* For managing affiliates/partners */
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_email TEXT,
  referral_fee_percent INT DEFAULT 10,
  api_key TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Partners Table */
/* For managing affiliates/partners */
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_email TEXT,
  referral_fee_percent INT DEFAULT 10,
  api_key TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Offers Table */
/* For courses/products with referral details */
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,          -- e.g., 'pregnancy', 'career'
  price_cents INT,
  discount_percent INT DEFAULT 0,
  referral_link TEXT NOT NULL,
  payment_type TEXT DEFAULT 'external',  -- 'telegram' or 'external'
  active BOOLEAN DEFAULT TRUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

/* ---------------------- */
/* Referrals Table */
/* To track earnings */
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES "users"(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  referral_link TEXT,
  status TEXT DEFAULT 'sent',             -- 'sent', 'clicked', 'purchased'
  commission_earned_cents INT DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

/* Ensure columns exist (idempotent) */
DO $
BEGIN
    -- Add category to offers if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'category'
    ) THEN
        ALTER TABLE offers ADD COLUMN category TEXT;
    END IF;

    -- Add discount_percent if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'discount_percent'
    ) THEN
        ALTER TABLE offers ADD COLUMN discount_percent INT DEFAULT 0;
    END IF;

    -- Add payment_type if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE offers ADD COLUMN payment_type TEXT DEFAULT 'external';
    END IF;

    -- Add commission_earned_cents to referrals if missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'commission_earned_cents'
    ) THEN
        ALTER TABLE referrals ADD COLUMN commission_earned_cents INT DEFAULT 0;
    END IF;
END $;

/* Indexes – created only if they don’t already exist */
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_offers_category'
    ) THEN
        CREATE INDEX idx_offers_category ON offers (category);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_referrals_user'
    ) THEN
        CREATE INDEX idx_referrals_user ON referrals (user_id);
    END IF;
END $;