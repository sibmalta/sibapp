-- Orders schema contract repair.
--
-- This migration is intentionally broad and idempotent. The Orders page and
-- checkout/order lifecycle code have grown through multiple incremental
-- migrations, and production has repeatedly drifted behind the frontend bundle.
-- Keep this file as the current contract for every public.orders column the
-- app reads/writes so a missed older migration can be repaired safely.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_ref TEXT,
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS listing_title TEXT,
  ADD COLUMN IF NOT EXISTS listing_image TEXT,
  ADD COLUMN IF NOT EXISTS item_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundled_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_payout NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_payout_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS delivery_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stripe_fee_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'held',
  ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'sib_delivery',
  ADD COLUMN IF NOT EXISTS fulfilment_provider TEXT DEFAULT 'myconvenience',
  ADD COLUMN IF NOT EXISTS fulfilment_method TEXT,
  ADD COLUMN IF NOT EXISTS fulfilment_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fulfilment_status TEXT DEFAULT 'awaiting_fulfilment',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_listing_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bundle_offer_id UUID,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS overdue_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS overdue_flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_scan_token TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_id UUID,
  ADD COLUMN IF NOT EXISTS dropoff_store_name TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_address TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_locality TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_zone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_timing TEXT,
  ADD COLUMN IF NOT EXISTS auto_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_confirmation_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_full_name TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS buyer_city TEXT,
  ADD COLUMN IF NOT EXISTS buyer_postcode TEXT,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS locker_location_name TEXT,
  ADD COLUMN IF NOT EXISTS locker_address TEXT,
  ADD COLUMN IF NOT EXISTS locker_location JSONB,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS seller_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT,
  ADD COLUMN IF NOT EXISTS seller_address TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS seller_stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS payment_flow_type TEXT DEFAULT 'separate_charge',
  ADD COLUMN IF NOT EXISTS seller_payout_status TEXT,
  ADD COLUMN IF NOT EXISTS auto_release_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_release_result JSONB,
  ADD COLUMN IF NOT EXISTS auto_release_error TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS order_ref TEXT,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'awaiting_shipment',
  ADD COLUMN IF NOT EXISTS courier TEXT DEFAULT 'MYConvenience',
  ADD COLUMN IF NOT EXISTS fulfilment_provider TEXT DEFAULT 'myconvenience',
  ADD COLUMN IF NOT EXISTS fulfilment_method TEXT,
  ADD COLUMN IF NOT EXISTS fulfilment_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS fulfilment_status TEXT DEFAULT 'awaiting_fulfilment',
  ADD COLUMN IF NOT EXISTS delivery_type TEXT,
  ADD COLUMN IF NOT EXISTS shipment_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipment_reference TEXT,
  ADD COLUMN IF NOT EXISTS locker_location JSONB,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS maltapost_consignment_id TEXT,
  ADD COLUMN IF NOT EXISTS maltapost_barcode TEXT,
  ADD COLUMN IF NOT EXISTS sender_address JSONB,
  ADD COLUMN IF NOT EXISTS recipient_address JSONB,
  ADD COLUMN IF NOT EXISTS ship_by_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_store_id UUID,
  ADD COLUMN IF NOT EXISTS dropoff_store_name TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_address TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_store_locality TEXT,
  ADD COLUMN IF NOT EXISTS pickup_zone TEXT,
  ADD COLUMN IF NOT EXISTS dropped_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dropoff_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location_name TEXT,
  ADD COLUMN IF NOT EXISTS delivery_timing TEXT,
  ADD COLUMN IF NOT EXISTS current_location TEXT,
  ADD COLUMN IF NOT EXISTS fallback_store_name TEXT,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_proof TEXT,
  ADD COLUMN IF NOT EXISTS delivery_signature_url TEXT,
  ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS return_reason TEXT,
  ADD COLUMN IF NOT EXISTS weight_grams INTEGER,
  ADD COLUMN IF NOT EXISTS parcel_size TEXT,
  ADD COLUMN IF NOT EXISTS maltapost_label_url TEXT,
  ADD COLUMN IF NOT EXISTS maltapost_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maltapost_raw_status TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller ON public.shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer ON public.shipments(buyer_id);

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%payment_flow_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_flow_type_check
  CHECK (
    payment_flow_type IS NULL OR
    payment_flow_type IN ('separate_charge', 'destination_charge', 'separate_charge_then_transfer')
  ) NOT VALID;
