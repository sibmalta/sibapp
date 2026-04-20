-- ============================================================
-- Migration 010: Fix payout_status CHECK constraint
-- Add 'refunded' to allowed values so create-refund edge
-- function can set payout_status = 'refunded' without error.
-- ============================================================

-- Drop the existing CHECK constraint and recreate with 'refunded' added.
-- Constraint name follows the PostgreSQL auto-naming convention: orders_payout_status_check
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payout_status_check;

-- ALTER TABLE orders ADD CONSTRAINT orders_payout_status_check
-- CHECK (payout_status IN ( 'held','pending','released','paid','failed','refunded'));