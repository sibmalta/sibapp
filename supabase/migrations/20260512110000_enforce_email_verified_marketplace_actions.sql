-- Profiles may exist before verification, but marketplace writes require a verified email.

CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt()->>'email_confirmed_at', '') <> ''
    OR coalesce(auth.jwt()->>'confirmed_at', '') <> ''
    OR coalesce(auth.jwt()->>'email_verified', '') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.can_write_marketplace()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_email_verified() OR public.is_admin();
$$;

DROP POLICY IF EXISTS "listings_owner_insert" ON public.listings;
CREATE POLICY "listings_owner_insert" ON public.listings
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "listings_owner_update" ON public.listings;
CREATE POLICY "listings_owner_update" ON public.listings
  FOR UPDATE
  USING ((auth.uid() = seller_id AND public.can_write_marketplace()) OR public.is_admin())
  WITH CHECK ((auth.uid() = seller_id AND public.can_write_marketplace()) OR public.is_admin());

DROP POLICY IF EXISTS "listings_owner_delete" ON public.listings;
CREATE POLICY "listings_owner_delete" ON public.listings
  FOR DELETE
  USING ((auth.uid() = seller_id AND public.can_write_marketplace()) OR public.is_admin());

DROP POLICY IF EXISTS "likes_owner_write" ON public.listing_likes;
CREATE POLICY "likes_owner_write" ON public.listing_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "orders_buyer_insert" ON public.orders;
CREATE POLICY "orders_buyer_insert" ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "orders_participant_update" ON public.orders;
CREATE POLICY "orders_participant_update" ON public.orders
  FOR UPDATE
  USING ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace())
  WITH CHECK ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "shipments_seller_insert" ON public.shipments;
CREATE POLICY "shipments_seller_insert" ON public.shipments
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "shipments_participant_update" ON public.shipments;
CREATE POLICY "shipments_participant_update" ON public.shipments
  FOR UPDATE
  USING ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace())
  WITH CHECK ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "disputes_participant_insert" ON public.disputes;
CREATE POLICY "disputes_participant_insert" ON public.disputes
  FOR INSERT
  WITH CHECK ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "disputes_participant_update" ON public.disputes;
CREATE POLICY "disputes_participant_update" ON public.disputes
  FOR UPDATE
  USING ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace())
  WITH CHECK ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "payouts_insert" ON public.payouts;
CREATE POLICY "payouts_insert" ON public.payouts
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "payouts_update" ON public.payouts;
CREATE POLICY "payouts_update" ON public.payouts
  FOR UPDATE
  USING (auth.uid() = seller_id AND public.can_write_marketplace())
  WITH CHECK (auth.uid() = seller_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "conversations_participant_insert" ON public.conversations;
CREATE POLICY "conversations_participant_insert" ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "conversations_participant_update" ON public.conversations;
CREATE POLICY "conversations_participant_update" ON public.conversations
  FOR UPDATE
  USING (auth.uid() = ANY(participant_ids) AND public.can_write_marketplace())
  WITH CHECK (auth.uid() = ANY(participant_ids) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "messages_sender_insert" ON public.messages;
CREATE POLICY "messages_sender_insert" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.can_write_marketplace()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() = ANY(c.participant_ids)
    )
  );

DROP POLICY IF EXISTS "offers_buyer_insert" ON public.offers;
CREATE POLICY "offers_buyer_insert" ON public.offers
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id AND public.can_write_marketplace());

DROP POLICY IF EXISTS "offers_participant_update" ON public.offers;
CREATE POLICY "offers_participant_update" ON public.offers
  FOR UPDATE
  USING ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace())
  WITH CHECK ((auth.uid() = buyer_id OR auth.uid() = seller_id) AND public.can_write_marketplace());

DROP POLICY IF EXISTS "dispute_messages_participant_insert_evidence" ON public.dispute_messages;
CREATE POLICY "dispute_messages_participant_insert_evidence" ON public.dispute_messages
  FOR INSERT
  WITH CHECK (
    public.can_write_marketplace()
    AND EXISTS (
      SELECT 1
      FROM public.disputes d
      WHERE d.id = dispute_id
        AND auth.uid() IN (d.buyer_id, d.seller_id)
    )
  );

DROP POLICY IF EXISTS "listing_images_owner_insert" ON storage.objects;
CREATE POLICY "listing_images_owner_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.can_write_marketplace()
  );

DROP POLICY IF EXISTS "listing_images_owner_update" ON storage.objects;
CREATE POLICY "listing_images_owner_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.can_write_marketplace()
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.can_write_marketplace()
  );

DROP POLICY IF EXISTS "listing_images_owner_delete" ON storage.objects;
CREATE POLICY "listing_images_owner_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND public.can_write_marketplace()
  );
