-- Run this in your Supabase SQL Editor to enable the share feature
-- Go to: https://app.supabase.com → Your Project → SQL Editor

CREATE TABLE IF NOT EXISTS shared_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  posts JSONB NOT NULL DEFAULT '[]',
  batch_strategy JSONB,
  post_strategies JSONB DEFAULT '{}',
  scan_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shared_scans ENABLE ROW LEVEL SECURITY;

-- Anyone can read shared scans (they're public by design)
CREATE POLICY "Shared scans viewable by everyone"
  ON shared_scans FOR SELECT USING (true);

-- Authenticated users can create their own shares
CREATE POLICY "Users can insert their own shares"
  ON shared_scans FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
  ON shared_scans FOR DELETE USING (auth.uid() = user_id);
