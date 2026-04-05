import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function BuyerProtectionPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-2">
        <ShieldCheck size={22} className="text-green-600 flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Buyer Protection</h1>
      </div>
      <p className="text-sm text-sib-muted mb-6">
        Every purchase on Sib is protected. Here is how it works.
      </p>

      {/* How it works */}
      <div className="space-y-4 mb-8">
        <h2 className="font-bold text-base text-sib-text">How your payment is protected</h2>

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
            <p className="text-sm font-semibold text-sib-text">Seller ships your item</p>
            <p className="text-xs text-sib-muted mt-0.5">The seller ships the item via Sib's tracked delivery service through MaltaPost.</p>
          </div>
        </div>

        <div className="flex gap-3 items-start p-4 rounded-2xl bg-green-50">
          <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
          <div>
            <p className="text-sm font-semibold text-sib-text">You confirm delivery</p>
            <p className="text-xs text-sib-muted mt-0.5">Once you receive the item and are happy with it, confirm delivery in the app. Only then does the seller get paid.</p>
          </div>
        </div>
      </div>

      {/* 48 hours */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-sib-warm border border-sib-stone mb-8">
        <Clock size={20} className="text-sib-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-sib-text">48-hour window</p>
          <p className="text-xs text-sib-muted mt-0.5">
            After delivery, you have 48 hours to inspect the item and report any issues. 
            If you do not raise a dispute within this time, the transaction is finalised.
          </p>
        </div>
      </div>

      {/* What is covered */}
      <div className="mb-6">
        <h2 className="font-bold text-base text-sib-text mb-3">What is covered</h2>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sib-text">Item not received</p>
              <p className="text-xs text-sib-muted mt-0.5">If your item never arrives, you will receive a full refund.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50">
            <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sib-text">Item not as described</p>
              <p className="text-xs text-sib-muted mt-0.5">If the item significantly differs from the listing description, photos, or stated condition, you can open a dispute.</p>
            </div>
          </div>
        </div>
      </div>

      {/* What is NOT covered */}
      <div className="mb-8">
        <h2 className="font-bold text-base text-sib-text mb-3">What is not covered</h2>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50">
            <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sib-text">Size or fit issues</p>
              <p className="text-xs text-sib-muted mt-0.5">If the item fits differently than expected, this is not grounds for a refund. Always check the size details before buying.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50">
            <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sib-text">Change of mind</p>
              <p className="text-xs text-sib-muted mt-0.5">If you simply change your mind about the purchase, this is not covered by buyer protection.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <p className="text-xs text-sib-muted leading-relaxed">
          Buyer protection is automatically included with every purchase made through Sib. 
          No extra cost, no sign-up required. See our <Link to="/refund-policy" className="text-sib-primary font-semibold underline underline-offset-2">Refund Policy</Link> and <Link to="/terms" className="text-sib-primary font-semibold underline underline-offset-2">Terms & Conditions</Link> for 
          full details.
        </p>
      </div>
    </div>
  )
}
