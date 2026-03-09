-- Add default min/max interaction thresholds to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS min_interactions INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_interactions INTEGER DEFAULT 0;
