-- Migration 021: repair orders delivery snapshot columns for live schema drift.
-- Checkout now writes canonical delivery data to shipping_address JSONB, but these
-- columns are kept for admin/reporting views and compatibility with older records.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS bundled_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS buyer_full_name TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS buyer_city TEXT,
  ADD COLUMN IF NOT EXISTS buyer_postcode TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS locker_location_name TEXT,
  ADD COLUMN IF NOT EXISTS locker_address TEXT,
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT,
  ADD COLUMN IF NOT EXISTS seller_address TEXT;
