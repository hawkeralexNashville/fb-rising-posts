-- Content Generation Module migration
-- Run this in Supabase SQL editor

-- 1. Add encrypted API key columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS anthropic_key_enc TEXT,
  ADD COLUMN IF NOT EXISTS kie_key_enc TEXT;
-- Note: apify_key_enc may already exist from earlier migration

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS apify_key_enc TEXT;

-- 2. Content pages (brand profiles)
CREATE TABLE IF NOT EXISTS content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  competitor_urls TEXT[] DEFAULT '{}',
  brand_voice TEXT DEFAULT '',
  tone TEXT DEFAULT 'conversational',
  hashtags TEXT[] DEFAULT '{}',
  image_style_prompt TEXT DEFAULT '',
  image_aspect_ratio TEXT DEFAULT '1:1',
  watermark_position TEXT DEFAULT 'bottom-right',
  logo_storage_path TEXT,
  watermark_storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content pages"
  ON content_pages FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Content batches (job runs)
CREATE TABLE IF NOT EXISTS content_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued', -- queued, running, done, error
  progress_step TEXT DEFAULT 'queued',
  progress_pct INTEGER DEFAULT 0,
  progress_message TEXT DEFAULT '',
  zip_storage_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE content_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content batches"
  ON content_batches FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Content posts (individual generated posts within a batch)
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES content_batches(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT,
  source_text TEXT,
  source_image_url TEXT,
  engagement_score INTEGER DEFAULT 0,
  captions TEXT[] DEFAULT '{}',
  selected_caption INTEGER DEFAULT 0, -- index into captions array
  edited_caption TEXT,
  image_storage_path TEXT,
  status TEXT DEFAULT 'pending', -- pending, captions_done, image_done, done, error
  review_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own content posts"
  ON content_posts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Enable Realtime on content_batches (for live progress)
ALTER PUBLICATION supabase_realtime ADD TABLE content_batches;
