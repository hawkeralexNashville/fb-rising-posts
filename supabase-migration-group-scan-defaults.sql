-- Add default group scan interaction thresholds to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS group_min_comments INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS group_min_reactions INTEGER DEFAULT 10;
