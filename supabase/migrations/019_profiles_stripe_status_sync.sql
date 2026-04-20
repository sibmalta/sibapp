-- Migration 019: normalize Stripe Connect seller status fields

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS details_submitted BOOLEAN DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_status_updated_at TIMESTAMPTZ;

UPDATE profiles
SET
  details_submitted = COALESCE(details_submitted, stripe_onboarding_complete, false),
  stripe_status_updated_at = COALESCE(stripe_status_updated_at, updated_at, created_at, NOW())
WHERE stripe_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
  ON profiles(stripe_account_id);
