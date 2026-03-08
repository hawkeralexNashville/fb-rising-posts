-- Run this in your Supabase SQL Editor
-- Go to: https://app.supabase.com → Your Project → SQL Editor

-- Add Apify API token column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS apify_api_token TEXT;

-- If user_settings table doesn't exist yet, create it with all columns
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  min_velocity INTEGER DEFAULT 50,
  min_delta INTEGER DEFAULT 20,
  max_post_age_hours NUMERIC DEFAULT 6,
  is_admin BOOLEAN DEFAULT FALSE,
  apify_api_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS if not already
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own settings
DO $$ BEGIN
  CREATE POLICY "Users can read own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
