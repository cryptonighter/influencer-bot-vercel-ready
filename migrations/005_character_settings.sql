/* -------------- Character Settings ---------------- */
/* Separate migration for character_settings table */

CREATE TABLE IF NOT EXISTS character_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,  -- e.g., 'tone', 'style_mirroring'
  setting_value JSONB,             -- Flexible for complex data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE character_settings ENABLE ROW LEVEL SECURITY;