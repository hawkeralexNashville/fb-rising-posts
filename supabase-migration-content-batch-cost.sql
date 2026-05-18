-- Add time window and cost tracking to content_batches
ALTER TABLE content_batches
  ADD COLUMN IF NOT EXISTS time_window_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS scrape_cost_usd NUMERIC(10, 6) DEFAULT 0;
