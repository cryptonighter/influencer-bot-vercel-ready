/* -------------------------------------------------
   Partners Table – single definition
   ------------------------------------------------- */
DROP TABLE IF EXISTS partners CASCADE;
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

/* -------------------------------------------------
   Offers Table – add missing column if table already exists
   ------------------------------------------------- */
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_cents INT,
  discount_percent INT DEFAULT 0,
  referral_link TEXT NOT NULL,
  payment_type TEXT DEFAULT 'external',
  active BOOLEAN DEFAULT TRUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

/* -------------------------------------------------
   Ensure required columns exist (idempotent)
   ------------------------------------------------- */
DO $
BEGIN
    -- partner_id column (nullable until FK is added)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'partner_id'
    ) THEN
        ALTER TABLE offers ADD COLUMN partner_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'category'
    ) THEN
        ALTER TABLE offers ADD COLUMN category TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'discount_percent'
    ) THEN
        ALTER TABLE offers ADD COLUMN discount_percent INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'offers' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE offers ADD COLUMN payment_type TEXT DEFAULT 'external';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'referrals' AND column_name = 'commission_earned_cents'
    ) THEN
        ALTER TABLE referrals ADD COLUMN commission_earned_cents INT DEFAULT 0;
    END IF;
END $;

/* -------------------------------------------------
   Referrals Table – create if missing
   ------------------------------------------------- */
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  offer_id UUID,
  referral_link TEXT,
  status TEXT DEFAULT 'sent',
  commission_earned_cents INT DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

/* -------------------------------------------------
   Add foreign‑key constraints if they don’t exist
   ------------------------------------------------- */
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'offers_partner_id_fkey'
    ) THEN
        ALTER TABLE offers
            ADD CONSTRAINT offers_partner_id_fkey
            FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'referrals_user_id_fkey'
    ) THEN
        ALTER TABLE referrals
            ADD CONSTRAINT referrals_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'referrals_offer_id_fkey'
    ) THEN
        ALTER TABLE referrals
            ADD CONSTRAINT referrals_offer_id_fkey
            FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
    END IF;
END $;

/* -------------------------------------------------
   Indexes – created only if they don’t already exist
   ------------------------------------------------- */
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