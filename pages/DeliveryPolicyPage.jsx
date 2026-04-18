import React from 'react'
import { Link } from 'react-router-dom'
import { Truck, AlertTriangle, Clock, MapPin, Package } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets, PolicyCallout } from '../components/PolicyLayout'

export default function DeliveryPolicyPage() {
  return (
    <PolicyLayout
      icon={Truck}
      title="Delivery Policy"
      subtitle="How collection and delivery works on Sib."
      lastUpdated="January 2025"
    >
      <PolicySection number={1} title="How Sib delivery works">
        <p>
          Sib manages the entire delivery process from collection to drop-off.
          When you purchase an item, Sib arranges collection from the seller and
          delivery to your specified address. You do not need to arrange your own
          delivery or meet the seller in person.
        </p>
      </PolicySection>

      <PolicySection number={2} title="No self-collection or meetups">
        <PolicyCallout icon={AlertTriangle} variant="warning" title="Important">
          Direct buyer-seller meetups and self-collection are not permitted on Sib.
          All items must go through Sib's logistics flow. This ensures every transaction
          is tracked, protected, and covered by Buyer Protection.
        </PolicyCallout>
      </PolicySection>

      <PolicySection number={3} title="Collection from sellers">
        <PolicyBullets items={[
          'Once an item is sold, Sib schedules collection from the seller',
          'Sellers must ensure the item is packed and ready for collection at the agreed time',
          'Collection windows are assigned by Sib based on operational routes and zones',
          'Sellers may be asked to confirm their availability for collection',
          'Missed or failed collections may be rescheduled, and repeated missed collections may result in fees or account restrictions',
        ]} />
      </PolicySection>

      <PolicySection number={4} title="Delivery to buyers">
        <PolicyBullets items={[
          'Deliveries are scheduled by Sib and follow zone-based operational routes across Malta',
          'Buyers may be asked to confirm their availability or preferred delivery window',
          'Delivery dates and times are operational estimates, not guarantees',
          'Sib will make reasonable efforts to deliver within the estimated timeframe communicated at checkout',
        ]} />
      </PolicySection>

      <PolicySection number={5} title="Delivery estimates">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
          <Clock size={18} className="text-sib-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sib-text">Estimated delivery windows</p>
            <p className="text-xs text-sib-muted mt-1 leading-relaxed">
              Delivery estimates shown at checkout are based on current operational capacity and
              logistics planning. These are estimates only and may be affected by factors such as
              weather, public holidays, volume, or zone availability. Sib does not guarantee
              specific delivery dates or times.
            </p>
          </div>
        </div>
      </PolicySection>

      <PolicySection number={6} title="Missed deliveries">
        <PolicyBullets items={[
          'If a delivery attempt is unsuccessful because the buyer is unavailable, Sib may reschedule the delivery',
          'Repeated missed deliveries may result in additional fees or restrictions on the buyer\'s account',
          'Buyers should ensure someone is available to receive the item during the confirmed delivery window',
        ]} />
      </PolicySection>

      <PolicySection number={7} title="Safe place delivery">
        <p>
          Sib may offer the option for buyers to designate a safe place for delivery
          (such as a porch, letterbox, or with a neighbour). If this option is enabled and selected
          by the buyer, Sib is not liable for items left at the designated safe place after successful
          drop-off. The buyer assumes responsibility once the item is placed at the chosen location.
        </p>
      </PolicySection>

      <PolicySection number={8} title="Delivery issues">
        <p className="mb-2">If your item has not arrived or there is a delivery issue:</p>
        <PolicyBullets items={[
          'Check the tracking information in the app for the latest status',
          'If the item is marked as delivered but you have not received it, open a dispute within 48 hours',
          'Sib will investigate delivery issues and work to resolve them promptly',
        ]} />
        <p className="mt-2">
          For more on how to raise an issue, see our <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes, Returns & Refunds Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={9} title="Damage in transit">
        <p>
          If an item is damaged during delivery, the buyer should open a dispute within 48 hours
          of receiving the item. Sib will review the claim and evidence provided. Damage caused
          during transit may be eligible for a refund under{' '}
          <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection</Link>.
        </p>
      </PolicySection>

      <PolicySection number={10} title="Changes to this policy">
        <p>
          We may update this delivery policy from time to time as our logistics model evolves.
          If we make significant changes, we will notify users through the app.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
