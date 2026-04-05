-- ============================================================
-- Migration 004: Add Stripe Connect columns to profiles
-- Required by Edge Functions: create-connected-account,
-- create-account-link, create-payment-intent, create-transfer
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS charges_enabled            BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payouts_enabled            BOOLEAN DEFAULT false;
