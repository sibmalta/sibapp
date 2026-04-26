import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react'

export default function RefundPolicyPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-2">
        <RefreshCw size={22} className="text-sib-primary flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Refund Policy</h1>
      </div>
      <p className="text-sm text-sib-muted mb-6">
        Clear, fair, and straightforward. Here is how refunds work on Sib.
      </p>

      <div className="space-y-6 text-sm text-sib-text leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-2">How to get a refund</h2>
          <p>
            Refunds on Sib are issued through the dispute process only. If you have an 
            issue with an item you purchased, open a dispute from your order page within 
            48 hours of delivery.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">Who decides the outcome?</h2>
          <p>
            Sib reviews every dispute fairly. We look at the listing details, photos, messages 
            between both parties, and any evidence provided. Based on this review, Sib will 
            make a final decision on whether a refund is warranted.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">How refunds are processed</h2>
          <div className="space-y-3 mt-3">
            <div className="flex gap-3 items-start p-3.5 rounded-xl sib-elevated border">
              <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
              <p className="text-sm text-sib-text">Dispute is reviewed by the Sib team (usually within 24-48 hours).</p>
            </div>
            <div className="flex gap-3 items-start p-3.5 rounded-xl sib-elevated border">
              <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
              <p className="text-sm text-sib-text">If approved, the refund is processed back to your original payment method.</p>
            </div>
            <div className="flex gap-3 items-start p-3.5 rounded-xl sib-elevated border">
              <div className="w-6 h-6 rounded-full bg-sib-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
              <p className="text-sm text-sib-text">Refunds typically appear in your account within 5-10 business days, depending on your bank or payment provider.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">What qualifies for a refund?</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-xs mt-0.5">YES</span>
              <span>Item was never received</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-xs mt-0.5">YES</span>
              <span>Item is significantly different from the listing</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold text-xs mt-0.5">NO</span>
              <span>You changed your mind about the purchase</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold text-xs mt-0.5">NO</span>
              <span>The item does not fit (check sizes before buying)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-500 font-bold text-xs mt-0.5">NO</span>
              <span>Minor wear consistent with the stated condition</span>
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-[#26322f] border border-amber-200 dark:border-[rgba(242,238,231,0.10)] transition-colors">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sib-text">Important</p>
            <p className="text-xs text-sib-muted mt-1">
              Sib's decision on disputes is final. We aim to be fair to both buyers and sellers. 
              Fraudulent refund claims may result in account suspension.
            </p>
          </div>
        </div>

        <section>
          <h2 className="font-bold text-base mb-2">Seller payouts</h2>
          <p>
            If a refund is issued, the seller will not receive payment for that order. 
            If the seller has already been paid (after the 48-hour window passed), 
            the refund amount will be deducted from future payouts.
          </p>
        </section>
      </div>

      <div className="mt-8 p-4 rounded-2xl sib-elevated border">
        <p className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed">
          For more details, see our <Link to="/buyer-protection" className="text-sib-primary font-semibold underline underline-offset-2">Buyer Protection Policy</Link> and <Link to="/terms" className="text-sib-primary font-semibold underline underline-offset-2">Terms & Conditions</Link>.
        </p>
      </div>
    </div>
  )
}
