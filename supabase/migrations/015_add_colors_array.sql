-- Migration 015: Add colors TEXT[] column for multi-colour support
-- The legacy `color` TEXT column is kept for backward compatibility.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';
