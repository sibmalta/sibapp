import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, AlertTriangle } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets, PolicyCallout } from '../components/PolicyLayout'

export default function TermsPage() {
  return (
    <PolicyLayout
      icon={FileText}
      title="Terms & Conditions"
      lastUpdated="January 2025"
    >
      <PolicySection number={1} title="About Sib">
        <p>
          Sib is an online marketplace that connects buyers and sellers of second-hand goods in Malta.
          Sib acts as an intermediary platform — we facilitate payments, coordinate collection and delivery,
          and provide a dispute resolution process. Sib is not the owner of any items listed on the platform.
        </p>
      </PolicySection>

      <PolicySection number={2} title="Role of Sib">
        <p className="mb-2">Sib facilitates:</p>
        <PolicyBullets items={[
          'Secure in-app payments between buyers and sellers',
          'Collection from sellers and delivery to buyers',
          'A structured dispute resolution process',
        ]} />
        <div className="mt-3">
          <PolicyCallout icon={AlertTriangle} variant="warning" title="Important">
            Sib does not inspect, verify, guarantee, or authenticate every item listed on the platform.
            Sib does not guarantee the quality, functionality, authenticity, fit, or suitability of any item.
            Sib protects the transaction process, not the product itself.
          </PolicyCallout>
        </div>
      </PolicySection>

      <PolicySection number={3} title="User responsibilities">
        <p className="font-semibold mb-1.5">Sellers must:</p>
        <PolicyBullets items={[
          'Provide accurate and honest item descriptions, including condition, defects, and sizing',
          'Disclose all known faults, damage, or defects',
          'Ensure items are available and ready for collection when purchased',
          'Pack items appropriately for safe transit',
          'Not attempt to arrange transactions outside the Sib platform',
        ]} />

        <p className="font-semibold mb-1.5 mt-4">Buyers must:</p>
        <PolicyBullets items={[
          'Review listings carefully before purchasing, including descriptions, photos, and size details',
          'Confirm delivery availability and provide accurate delivery information',
          'Raise any disputes within 48 hours of delivery',
          'Not attempt to arrange transactions outside the Sib platform',
        ]} />
      </PolicySection>

      <PolicySection number={4} title="Payments">
        <PolicyBullets items={[
          'All payments must be made through the Sib app — no cash, bank transfers, or off-platform payments are permitted',
          'When a buyer purchases an item, payment is held securely by Sib and is not released to the seller immediately',
          'The seller receives their payout after delivery is confirmed and the buyer protection window has expired, or after the dispute process is resolved',
          'A Buyer Protection Fee may apply to each transaction and is shown at checkout',
        ]} />
      </PolicySection>

      <PolicySection number={5} title="Delivery">
        <PolicyBullets items={[
          'All deliveries are managed by Sib through its scheduled logistics model',
          'Delivery dates and time windows are operational estimates and are not guaranteed',
          'No direct meetups, self-collection, or custom delivery arrangements are permitted',
          'Users may be asked to confirm collection or delivery availability',
        ]} />
        <p className="mt-2">
          For full details, see our <Link to="/delivery-policy" className="text-sib-primary font-semibold underline underline-offset-2">Delivery Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={6} title="Disputes">
        <PolicyBullets items={[
          'Buyers have 48 hours after delivery to raise an issue with a purchase',
          'Buyers must submit supporting evidence such as photos or videos when opening a dispute',
          'Sib reviews disputes and determines the resolution outcome at its discretion',
          'Both parties agree to cooperate with the dispute process and accept Sib\'s decision',
        ]} />
        <p className="mt-2">
          For full details, see our <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes, Returns & Refunds Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={7} title="Returns and refunds">
        <PolicyBullets items={[
          'Approved disputes may require the buyer to return the item before a refund is issued',
          'Refunds are not issued automatically for change of mind, sizing disappointment, or minor wear consistent with second-hand condition',
          'Sib may reject claims where evidence is insufficient or where the issue was disclosed by the seller',
        ]} />
        <p className="mt-2">
          For full details, see our <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={8} title="Prohibited conduct">
        <p className="mb-2">Users may not:</p>
        <PolicyBullets items={[
          'Share phone numbers, email addresses, social media handles, or other contact details to bypass Sib',
          'Arrange direct payments or transactions outside the app',
          'Arrange in-person meetups for item exchange',
          'Misuse or abuse the delivery process',
          'Submit false, misleading, or fraudulent disputes',
          'List prohibited or counterfeit items',
          'Engage in harassment, abuse, or threatening behaviour toward other users',
        ]} />
      </PolicySection>

      <PolicySection number={9} title="Account enforcement">
        <p>
          Sib may suspend, restrict, or permanently ban accounts that violate these terms.
          Sib may also cancel orders or hold payouts where fraud, abuse, or platform circumvention
          is suspected. We will notify affected users and explain the reason for any action taken
          where possible.
        </p>
      </PolicySection>

      <PolicySection number={10} title="Limitation of liability">
        <p>
          Sib is not liable for the quality, legality, authenticity, safety, or functionality
          of items listed on the platform beyond the protections explicitly stated in our policies.
          Sib's role is to facilitate the transaction, logistics, and dispute process.
          Users acknowledge that items are sold by independent sellers and that Sib acts
          solely as an intermediary platform.
        </p>
      </PolicySection>

      <PolicySection number={11} title="Changes to these terms">
        <p>
          We may update these terms from time to time. If we make significant changes,
          we will notify users through the app. Continued use of Sib after changes
          means you accept the updated terms.
        </p>
      </PolicySection>

      <PolicySection number={12} title="Acceptance of terms">
        <p>
          By creating an account on Sib or using the platform in any way, you confirm that you
          have read, understood, and agree to these Terms & Conditions and all related policies,
          including the{' '}
          <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>,{' '}
          <Link to="/seller-policy" className="text-sib-primary font-semibold underline underline-offset-2">Seller Policy</Link>,{' '}
          <Link to="/delivery-policy" className="text-sib-primary font-semibold underline underline-offset-2">Delivery Policy</Link>,{' '}
          <Link to="/disputes-refunds" className="text-sib-primary font-semibold underline underline-offset-2">Disputes & Refunds Policy</Link>, and{' '}
          <Link to="/privacy" className="text-sib-primary font-semibold underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
