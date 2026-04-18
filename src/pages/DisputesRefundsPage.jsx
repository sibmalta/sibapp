import React from 'react'
import { Link } from 'react-router-dom'
import { Scale, AlertTriangle, Clock, CheckCircle, XCircle, Camera } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets, PolicyCallout, PolicyCoveredItem, PolicyNotCoveredItem } from '../components/PolicyLayout'

export default function DisputesRefundsPage() {
  return (
    <PolicyLayout
      icon={Scale}
      title="Disputes, Returns & Refunds"
      subtitle="How to raise an issue and what to expect."
      lastUpdated="January 2025"
    >
      {/* 1 — Opening a dispute */}
      <PolicySection number={1} title="How to open a dispute">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-sib-warm border border-sib-stone mb-3">
          <Clock size={18} className="text-sib-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sib-text">48-hour window</p>
            <p className="text-xs text-sib-muted mt-0.5">
              You must raise a dispute within 48 hours of delivery. After this window closes,
              the transaction is finalised and the seller receives their payout.
            </p>
          </div>
        </div>
        <p className="mb-2">To open a dispute:</p>
        <PolicyBullets items={[
          'Go to your order in the app and tap "Report a problem"',
          'Select the reason for your dispute',
          'Provide a clear description of the issue',
          'Submit supporting evidence — photos and/or videos are required',
        ]} />
        <div className="mt-3">
          <PolicyCallout icon={Camera} variant="info" title="Evidence requirements">
            Clear photos or videos showing the issue are essential for processing your dispute.
            Without adequate evidence, Sib may not be able to resolve the dispute in your favour.
            Include photos of the item received, any damage, tags, labels, and the packaging.
          </PolicyCallout>
        </div>
      </PolicySection>

      {/* 2 — Eligible dispute types */}
      <PolicySection number={2} title="Eligible dispute reasons">
        <div className="space-y-2.5">
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item not as described"
            description="The item you received is significantly different from the listing description, photos, or stated condition."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item not working as described"
            description="The item was described as functional but does not work as stated."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Major undisclosed damage"
            description="The item has significant damage, faults, or defects that were not disclosed in the listing."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Wrong item received"
            description="You received a different item from the one shown in the listing."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Item not received"
            description="Your item was marked as delivered but you did not receive it."
          />
          <PolicyCoveredItem
            icon={CheckCircle}
            title="Damage in transit"
            description="The item was damaged during delivery and arrived in a condition different from what was sent."
          />
        </div>
      </PolicySection>

      {/* 3 — Not eligible */}
      <PolicySection number={3} title="Non-eligible dispute reasons">
        <div className="space-y-2.5">
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Change of mind"
            description="You simply no longer want the item. Second-hand purchases are final unless there is a genuine issue."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Fit or sizing disappointment"
            description="The item does not fit as you hoped, unless the seller clearly misrepresented the size."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Minor wear consistent with second-hand condition"
            description="Small signs of use that are normal for a pre-owned item and consistent with the listed condition."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Issues already disclosed by the seller"
            description="Faults, damage, or defects that were clearly stated in the listing description or photos."
          />
          <PolicyNotCoveredItem
            icon={XCircle}
            title="Items sold as faulty or for parts"
            description="Items explicitly listed as non-working, for parts, or sold as-is."
          />
        </div>
      </PolicySection>

      {/* 4 — Review process */}
      <PolicySection number={4} title="Review process">
        <div className="space-y-3">
          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-sib-warm border border-sib-stone">
            <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
            <p className="text-sm text-sib-text">You submit a dispute with evidence within 48 hours of delivery.</p>
          </div>
          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-sib-warm border border-sib-stone">
            <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
            <p className="text-sm text-sib-text">Sib reviews the evidence, the original listing, and any messages between buyer and seller.</p>
          </div>
          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-sib-warm border border-sib-stone">
            <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
            <p className="text-sm text-sib-text">The seller may be asked to respond or provide additional information.</p>
          </div>
          <div className="flex gap-3 items-start p-3.5 rounded-xl bg-sib-warm border border-sib-stone">
            <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
            <p className="text-sm text-sib-text">Sib determines the outcome and notifies both parties. Resolution is typically within 24–48 hours.</p>
          </div>
        </div>
      </PolicySection>

      {/* 5 — Possible outcomes */}
      <PolicySection number={5} title="Possible outcomes">
        <PolicyBullets items={[
          'Dispute rejected — the evidence does not support the claim, or the issue is not eligible for a refund',
          'Return required for refund — the buyer must return the item to Sib before a refund is issued',
          'Full refund after return confirmation — once Sib confirms the item has been returned, a full refund is processed',
          'Partial refund — in some cases, a partial refund may be offered at Sib\'s discretion',
          'Other resolution — Sib may determine an alternative resolution based on the circumstances',
        ]} />
      </PolicySection>

      {/* 6 — Returns */}
      <PolicySection number={6} title="Returns">
        <PolicyBullets items={[
          'If a return is required, Sib will arrange collection of the item from the buyer',
          'The item must be returned in the same condition it was received',
          'Refunds are processed after Sib confirms receipt of the returned item',
          'Buyers should not return items directly to the seller — all returns must go through Sib\'s logistics process',
        ]} />
      </PolicySection>

      {/* 7 — Refund processing */}
      <PolicySection number={7} title="How refunds are processed">
        <PolicyBullets items={[
          'Approved refunds are returned to your original payment method',
          'Refunds typically appear in your account within 5–10 business days, depending on your bank or payment provider',
          'The Buyer Protection Fee may or may not be refunded depending on the outcome and circumstances of the dispute',
        ]} />
      </PolicySection>

      {/* 8 — Seller payouts */}
      <PolicySection number={8} title="Impact on seller payouts">
        <p>
          If a refund is issued, the seller will not receive payment for that order.
          If the seller has already been paid (after the 48-hour window passed without a dispute),
          the refund amount may be deducted from future payouts.
        </p>
      </PolicySection>

      {/* 9 — Fraudulent disputes */}
      <PolicySection number={9} title="Fraudulent disputes">
        <PolicyCallout icon={AlertTriangle} variant="danger" title="Warning">
          Submitting false, misleading, or fraudulent dispute claims is a serious violation
          of Sib's terms. This may result in claim rejection, account suspension, or permanent ban.
          Sib reserves the right to take appropriate action against any user found to be abusing
          the dispute system.
        </PolicyCallout>
      </PolicySection>

      {/* 10 — Final decision */}
      <PolicySection number={10} title="Final decision">
        <p>
          Sib's decision on all disputes is final. We aim to be fair and transparent with
          both buyers and sellers. By using Sib, you agree to accept the outcome of the
          dispute resolution process as determined by our team.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
