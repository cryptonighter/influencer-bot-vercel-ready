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
ALTER TABLE offers ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'external';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS commission_earned_cents INT DEFAULT 0;

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
        ALTER TABLE offers ADD CONSTRAINT offers_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'referrals_user_id_fkey'
    ) THEN
        ALTER TABLE referrals ADD CONSTRAINT referrals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'referrals_offer_id_fkey'
    ) THEN
        ALTER TABLE referrals ADD CONSTRAINT referrals_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE;
    END IF;
END $;

/* -------------------------------------------------
   Indexes – created only if they don’t already exist
   ------------------------------------------------- */
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers (category);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals (user_id);