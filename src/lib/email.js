const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function sendEmail(type, to, payload = {}, meta = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
     headers: {
  'Content-Type': 'application/json',
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
},
      },
      body: JSON.stringify({
        type,
        to,
        data: payload, 
        meta,
      }),
    })

    if (!res.ok) {
      console.error('[sendEmail] failed', await res.text())
      return null
    }

    return res
  } catch (err) {
    console.error('[sendEmail] error', err)
    return null
  }
}

export function sendOrderConfirmedEmail(buyerEmail, buyerName, orderRef, itemTitle, totalPrice, deliveryMethod, meta = {}) {
  return sendEmail('order_confirmed', buyerEmail, { buyerName, orderRef, itemTitle, totalPrice, deliveryMethod }, meta)
}

export function sendPaymentConfirmedEmail(buyerEmail, buyerName, orderRef, totalPrice, meta = {}) {
  return sendEmail('payment_confirmed', buyerEmail, { buyerName, orderRef, totalPrice }, meta)
}

export function sendItemShippedEmail(buyerEmail, buyerName, itemTitle, orderRef, sellerName, meta = {}) {
  return sendEmail('item_shipped', buyerEmail, { buyerName, itemTitle, orderRef, sellerName }, meta)
}

export function sendItemDeliveredEmail(buyerEmail, buyerName, itemTitle, orderRef, meta = {}) {
  return sendEmail('item_delivered', buyerEmail, { buyerName, itemTitle, orderRef }, meta)
}

export function sendRefundConfirmedEmail(buyerEmail, buyerName, orderRef, refundAmount, itemTitle, meta = {}) {
  return sendEmail('refund_confirmed', buyerEmail, { buyerName, orderRef, refundAmount, itemTitle }, meta)
}

export function sendDisputeOpenedEmail(recipientEmail, recipientName, orderRef, reason, role = 'buyer', meta = {}) {
  return sendEmail('dispute_opened', recipientEmail, {
    recipientName,
    buyerName: recipientName,
    orderRef,
    reason,
    role,
  }, meta)
}

export function sendItemSoldEmail(sellerEmail, sellerName, itemTitle, orderRef, salePrice, buyerName, meta = {}) {
  return sendEmail('item_sold', sellerEmail, { sellerName, itemTitle, orderRef, salePrice, buyerName }, meta)
}

export function sendShippingReminderEmail(sellerEmail, sellerName, itemTitle, orderRef, daysSinceOrder, meta = {}) {
  return sendEmail('shipping_reminder', sellerEmail, { sellerName, itemTitle, orderRef, daysSinceOrder }, meta)
}

export function sendPayoutReleasedEmail(sellerEmail, sellerName, orderRef, payoutAmount, itemTitle, meta = {}) {
  return sendEmail('payout_released', sellerEmail, { sellerName, orderRef, payoutAmount, itemTitle }, meta)
}

export function sendOfferReceivedEmail(sellerEmail, itemTitle, offerPrice, buyerName, meta = {}) {
  return sendEmail('offer_received', sellerEmail, { itemTitle, offerPrice, buyerName }, meta)
}

export function sendOfferAcceptedEmail(buyerEmail, itemTitle, acceptedPrice, sellerName, meta = {}) {
  return sendEmail('offer_accepted', buyerEmail, { itemTitle, acceptedPrice, sellerName }, meta)
}

export function sendOfferDeclinedEmail(buyerEmail, itemTitle, declinedPrice, sellerName, meta = {}) {
  return sendEmail('offer_declined', buyerEmail, { itemTitle, declinedPrice, sellerName }, meta)
}

export function sendOfferCounteredEmail(buyerEmail, itemTitle, originalPrice, counterPrice, sellerName, meta = {}) {
  return sendEmail('offer_countered', buyerEmail, { itemTitle, originalPrice, counterPrice, sellerName }, meta)
}

export function sendOrderCancelledEmail(buyerEmail, buyerName, orderRef, itemTitle, refundAmount, meta = {}) {
  return sendEmail('order_cancelled', buyerEmail, { buyerName, orderRef, itemTitle, refundAmount }, meta)
}

export function sendOrderCancelledSellerEmail(sellerEmail, sellerName, orderRef, itemTitle, meta = {}) {
  return sendEmail('order_cancelled_seller', sellerEmail, { sellerName, orderRef, itemTitle }, meta)
}

export function sendDisputeResolvedEmail(userEmail, userName, orderRef, resolution, meta = {}) {
  return sendEmail('dispute_resolved', userEmail, { userName, orderRef, resolution }, meta)
}

export function sendDisputeMessageEmail(userEmail, userName, orderRef, messagePreview, meta = {}) {
  return sendEmail('dispute_message', userEmail, { userName, orderRef, messagePreview }, meta)
}

export function sendBundleOfferReceivedEmail(sellerEmail, itemCount, offerPrice, originalTotal, buyerName, meta = {}) {
  return sendEmail('bundle_offer_received', sellerEmail, { itemCount, offerPrice, originalTotal, buyerName }, meta)
}

export function sendBundleOfferAcceptedEmail(buyerEmail, itemCount, acceptedPrice, sellerName, meta = {}) {
  return sendEmail('bundle_offer_accepted', buyerEmail, { itemCount, acceptedPrice, sellerName }, meta)
}

export function sendBundleOfferDeclinedEmail(buyerEmail, itemCount, declinedPrice, sellerName, meta = {}) {
  return sendEmail('bundle_offer_declined', buyerEmail, { itemCount, declinedPrice, sellerName }, meta)
}

export function sendBundleOfferCounteredEmail(buyerEmail, itemCount, originalPrice, counterPrice, sellerName, meta = {}) {
  return sendEmail('bundle_offer_countered', buyerEmail, { itemCount, originalPrice, counterPrice, sellerName }, meta)
}

export function sendSuspiciousActivityEmail(userEmail, userName, message, meta = {}) {
  return sendEmail('suspicious_activity', userEmail, { userName, message }, meta)
}

export function sendModerationNoticeEmail(userEmail, userName, action, reason, details, meta = {}) {
  return sendEmail('moderation_notice', userEmail, { userName, action, reason, details }, meta)
}