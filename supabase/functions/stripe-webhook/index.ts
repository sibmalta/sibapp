import Stripe from 'npm:stripe@14.14.0'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

function getServiceRoleClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const signature = req.headers.get('stripe-signature')

    if (!stripeKey || !webhookSecret) {
      return jsonResponse({ error: 'Stripe webhook secrets are not configured.' }, 500)
    }

    if (!signature) {
      return jsonResponse({ error: 'Missing Stripe signature header.' }, 400)
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const cryptoProvider = Stripe.createSubtleCryptoProvider()
    const payload = await req.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, undefined, cryptoProvider)
    } catch (error) {
      console.error('[stripe-webhook] Signature verification failed:', error)
      return jsonResponse({ error: 'Invalid webhook signature.' }, 400)
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account
      const supabase = getServiceRoleClient()

      let userId = account.metadata?.user_id || null
      if (!userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_account_id', account.id)
          .maybeSingle()
        userId = profile?.id || null
      }

      if (userId) {
        const updates = {
          stripe_account_id: account.id,
          details_submitted: account.details_submitted || false,
          stripe_onboarding_complete: account.details_submitted || false,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          stripe_status_updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)

        if (error) {
          console.error('[stripe-webhook] Failed to sync Stripe account status:', error)
          return jsonResponse({ error: 'Failed to sync Stripe account status.' }, 500)
        }
      } else {
        console.warn('[stripe-webhook] No matching Sib profile found for Stripe account:', account.id)
      }
    }

    return jsonResponse({ received: true })
  } catch (error) {
    console.error('[stripe-webhook] Unexpected error:', error)
    return jsonResponse({ error: error.message || 'Webhook handling failed.' }, 500)
  }
})
