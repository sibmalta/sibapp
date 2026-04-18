-- ============================================================
-- Migration 016: Add collection_tags + manual_collection_tags to listings
-- ============================================================

ALTER TABLE listings ADD COLUMN IF NOT EXISTS collection_tags TEXT[] DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS manual_collection_tags TEXT[] DEFAULT '{}';

-- Index for filtering by collection tag
CREATE INDEX IF NOT EXISTS idx_listings_collection_tags ON listings USING GIN (collection_tags);
