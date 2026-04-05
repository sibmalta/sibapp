import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export default function TermsPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-6">
        <ShieldCheck size={22} className="text-sib-primary flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Terms & Conditions</h1>
      </div>

      <p className="text-xs text-sib-muted mb-6">Last updated: January 2025</p>

      <div className="space-y-6 text-sm text-sib-text leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-2">1. What is Sib?</h2>
          <p>
            Sib is a marketplace that connects buyers and sellers of second-hand fashion in Malta. 
            We act as an intermediary — we provide the platform, payment processing, and delivery 
            coordination, but we do not own or stock any of the items listed.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">2. Seller responsibilities</h2>
          <p>
            Sellers are fully responsible for the accuracy of their listings, including descriptions, 
            photos, sizing, condition, and pricing. Items must be accurately represented and must 
            comply with our <Link to="/prohibited-items" className="text-sib-primary font-semibold underline underline-offset-2">Prohibited Items</Link> policy.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">3. Buyer awareness</h2>
          <p>
            All items on Sib are second-hand unless stated otherwise. While we offer 
            buyer protection, Sib is not responsible for the condition of items beyond what 
            is covered under the <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">4. Disputes</h2>
          <p>
            If there is a disagreement between a buyer and seller, Sib reserves the right 
            to review the case and make a final decision. Both parties agree to cooperate 
            with the dispute process and accept Sib's resolution. See our <Link to="/refund-policy" className="text-sib-primary font-semibold underline underline-offset-2">Refund Policy</Link> for 
            details on how refunds are handled.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">5. Platform rules</h2>
          <p className="mb-2">By using Sib, you agree to:</p>
          <ul className="space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
              <span>Be respectful in all communication with other users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
              <span>Not list prohibited or counterfeit items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
              <span>Complete transactions through the Sib platform only</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
              <span>Not attempt to circumvent fees or protection mechanisms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
              <span>Keep your account information accurate and up to date</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">6. Account suspension</h2>
          <p>
            Sib may suspend or permanently remove accounts that violate these terms, 
            engage in fraudulent activity, or receive repeated complaints. We will 
            notify affected users and explain the reason for any action taken.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">7. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. If we make significant changes, 
            we will notify users through the app. Continued use of Sib after changes 
            means you accept the updated terms.
          </p>
        </section>
      </div>

      <div className="mt-8 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <p className="text-xs text-sib-muted leading-relaxed">
          Have questions about our terms? Check our <Link to="/faq" className="text-sib-primary font-semibold underline underline-offset-2">FAQ</Link> or <Link to="/contact" className="text-sib-primary font-semibold underline underline-offset-2">contact our support team</Link> and we'll be happy to help.
        </p>
      </div>
    </div>
  )
}
