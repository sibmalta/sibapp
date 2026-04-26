import React from 'react'
import { Link } from 'react-router-dom'
import { Store, AlertTriangle, CheckCircle } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets, PolicyCallout } from '../components/PolicyLayout'

export default function SellerPolicyPage() {
  return (
    <PolicyLayout
      icon={Store}
      title="Seller Policy"
      subtitle="Everything you need to know about selling on Sib."
      lastUpdated="January 2025"
    >
      <PolicySection number={1} title="Seller fees">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 dark:bg-[#26322f] border border-green-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sib-text">0% seller fees</p>
            <p className="text-xs text-sib-muted mt-0.5">
              Sib currently charges no commission or fees to sellers. The price you set is the price you receive.
              We may introduce seller fees in the future, and will notify all sellers in advance of any changes.
            </p>
          </div>
        </div>
      </PolicySection>

      <PolicySection number={2} title="Listing your items">
        <p className="mb-2">When listing an item on Sib, you must:</p>
        <PolicyBullets items={[
          'Provide an accurate and honest description of the item, including brand, size, colour, and material where relevant',
          'Upload clear, genuine photos that accurately represent the item\'s current condition',
          'Disclose all known faults, defects, stains, damage, missing parts, or signs of wear',
          'Set a fair and honest price',
          'Only list items you own and have the right to sell',
          'Ensure items comply with Sib\'s Prohibited Items policy',
        ]} />
        <PolicyCallout icon={AlertTriangle} variant="warning" title="Accuracy matters">
          Listings that are misleading, inaccurate, or fail to disclose defects may result in disputes,
          forced refunds, account warnings, or suspension.
        </PolicyCallout>
      </PolicySection>

      <PolicySection number={3} title="Collection and packaging">
        <p className="mb-2">Once an item is sold:</p>
        <PolicyBullets items={[
          'You must make the item available for collection by Sib within the timeframe communicated to you',
          'You must pack the item securely and appropriately to prevent damage during transit',
          'Fragile or delicate items should be wrapped with adequate protection',
          'Items must match the listing — do not substitute or swap items',
        ]} />
        <p className="mt-2">
          Collection is managed by Sib. You do not need to arrange your own delivery or meet the buyer directly.
        </p>
      </PolicySection>

      <PolicySection number={4} title="Payouts">
        <PolicyBullets items={[
          'Your payout is processed after the buyer confirms receipt and the 48-hour buyer protection window expires without a dispute',
          'If a dispute is raised, your payout is held until the dispute is resolved',
          'Payouts are sent to the payment method configured in your payout settings',
          'Payout processing times may vary depending on your bank or payment provider',
        ]} />
      </PolicySection>

      <PolicySection number={5} title="Disputes and returns">
        <p>
          If a buyer raises a dispute, Sib will review the evidence from both sides.
          You may be asked to provide additional information or respond to the buyer's claim.
          If a dispute is resolved in the buyer's favour, a refund will be issued and your payout
          will be adjusted accordingly. You may be required to accept a return of the item.
        </p>
        <p className="mt-2">
          For full details, see our <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes, Returns & Refunds Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={6} title="Account enforcement">
        <p className="mb-2">
          Sellers may face warnings, restrictions, penalties, or account suspension for:
        </p>
        <PolicyBullets items={[
          'Repeated failed or missed collections',
          'Inaccurate or misleading item descriptions',
          'Attempting to arrange off-platform transactions (sharing phone numbers, emails, social media handles)',
          'Fraudulent activity, including listing counterfeit items or submitting false information',
          'Repeated disputes resolved against the seller',
          'Abusive or harassing behaviour toward buyers or Sib staff',
        ]} />
      </PolicySection>

      <PolicySection number={7} title="Off-platform transactions">
        <PolicyCallout icon={AlertTriangle} variant="danger">
          <p>
            Any attempt to move transactions off the Sib platform — including sharing contact details,
            arranging direct payments, or suggesting meetups — is strictly prohibited and may result
            in immediate account suspension. This policy exists to protect both buyers and sellers.
          </p>
        </PolicyCallout>
      </PolicySection>

      <PolicySection number={8} title="Changes to this policy">
        <p>
          We may update this policy from time to time. If we make significant changes,
          we will notify sellers through the app. Continued use of Sib after changes
          means you accept the updated policy.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
