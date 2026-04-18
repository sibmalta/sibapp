import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Clock, CheckCircle, XCircle, CreditCard } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets, PolicyCallout, PolicyCoveredItem, PolicyNotCoveredItem } from '../components/PolicyLayout'

export default function BuyerProtectionPage() {
  return (
    <PolicyLayout
      icon={ShieldCheck}
      title="Buyer Protection"
      subtitle="Every purchase on Sib is protected. Here is how it works."
      lastUpdated="January 2025"
    >
      {/* How payment is protected */}
      <PolicySection title="How your payment is protected">
        <div className="space-y-4">
          <div className="flex gap-3 items-start p-4 rounded-2xl bg-green-50">
            <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
            <div>
              <p className="text-sm font-semibold text-sib-text">Payment is held securely</p>
              <p className="text-xs text-sib-muted mt-0.5">When you buy an item, your payment is held by Sib — it is not sent to the seller immediately.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-4 rounded-2xl bg-green-50">
            <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
            <div>
              <p className="text-sm font-semibold text-sib-text">Item is collected and delivered</p>
              <p className="text-xs text-sib-muted mt-0.5">Sib collects the item from the seller and delivers it to you through our managed logistics.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-4 rounded-2xl bg-green-50">
            <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
            <div>
              <p className="text-sm font-semibold text-sib-text">48-hour inspection window</p>
              <p className="text-xs text-sib-muted mt-0.5">After delivery, you have 48 hours to inspect the item and report any issues.</p>
            </div>
          </div>

          <div className="flex gap-3 items-start p-4 rounded-2xl bg-green-50">
            <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
            <div>
              <p className="text-sm font-semibold text-sib-text">Seller gets paid</p>
              <p className="text-xs text-sib-muted mt-0.5">Only after the protection window expires without an issue does the seller receive their payout.</p>
            </div>
          </div>
        </div>
      </PolicySection>

      {/* 48-hour window */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <Clock size={20} className="text-sib-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-sib-text">48-hour window</p>
          <p className="text-xs text-sib-muted mt-0.5">
            After delivery, you have 48 hours to inspect the item and report any issues.
            If you do not raise a dispute within this time, the transaction is finalised
            and the seller receives their payout.
          </p>
        </div>
      </div>

      {/* Buyer Protection Fee */}
      <PolicySection title="Buyer Protection Fee">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
          <CreditCard size={18} className="text-sib-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sib-text">A small fee for your peace of mind</p>
            <p className="text-xs text-sib-muted mt-0.5 leading-relaxed">
              A Buyer Protection Fee is applied to each transaction and is shown clearly at checkout.
              This fee covers the cost of secure payment holding, dispute processing, and transaction protection.
              It is non-refundable unless the dispute is resolved in your favour under specific circumstances.
            </p>
          </div>
        </div>
      </PolicySection>

      {/* What is covered */}
      <PolicySection title="What Buyer Protection covers">
        <div className="space-y-2.5">
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item not received"
            description="Your item was not delivered to you. You are eligible for a full refund."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item significantly not as described"
            description="The item you received is materially different from the listing description, photos, or stated condition."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item not working as described"
            description="The item was listed as functional but does not work as stated by the seller."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Damage in transit"
            description="The item was damaged during delivery and arrived in a condition different from what the seller sent."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Major undisclosed faults"
            description="The item has significant defects or damage that the seller did not disclose in the listing."
          />
        </div>
      </PolicySection>

      {/* What is NOT covered */}
      <PolicySection title="What Buyer Protection does NOT cover">
        <div className="space-y-2.5">
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Change of mind"
            description="You changed your mind about the purchase. Second-hand sales are final unless there is a genuine issue."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Fit or sizing disappointment"
            description="The item does not fit as you hoped, unless the seller clearly misrepresented the size in the listing."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Minor wear consistent with second-hand condition"
            description="Small signs of normal use that are consistent with the item's listed condition (e.g. 'good' or 'well-loved')."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Issues already disclosed by the seller"
            description="Faults, damage, or defects that were clearly described in the listing description or shown in the photos."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Items sold as faulty or for parts"
            description="Items explicitly listed as non-working, for parts, or sold as-is."
          />
        </div>
      </PolicySection>

      {/* Evidence requirements */}
      <PolicySection title="Evidence requirements">
        <p className="mb-2">When opening a dispute, you will need to provide:</p>
        <PolicyBullets items={[
          'Clear photos or videos showing the issue with the item',
          'Photos of the item as received, including packaging',
          'Screenshots of the original listing for comparison if relevant',
          'A clear description of the problem',
        ]} />
        <PolicyCallout variant="info" title="Tip">
          The more evidence you provide, the faster and more accurately Sib can resolve your dispute.
          Take photos immediately upon receiving the item, before removing tags or altering the item in any way.
        </PolicyCallout>
      </PolicySection>

      {/* Outcome process */}
      <PolicySection title="Outcome process">
        <PolicyBullets items={[
          'Sib reviews all disputes within 24–48 hours',
          'The seller may be asked to respond with their own evidence',
          'Sib determines the outcome based on the evidence from both parties',
          'If approved, a refund is processed to your original payment method (5–10 business days)',
          'If a return is required, Sib arranges collection of the item from you before issuing the refund',
        ]} />
        <p className="mt-2">
          For the full dispute process, see our <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes, Returns & Refunds Policy</Link>.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
