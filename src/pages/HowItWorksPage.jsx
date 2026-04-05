import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Truck, CreditCard, Package, ArrowLeft,
  Camera, Tag, MessageSquare, Banknote, Clock, CheckCircle,
  AlertTriangle, RefreshCw, ChevronRight,
} from 'lucide-react'

export default function HowItWorksPage() {
  const navigate = useNavigate()

  return (
    <div className="pb-10 bg-white min-h-screen">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-sib-muted font-medium mb-3 hover:text-sib-text transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-sib-text tracking-tight">How Sib Works</h1>
        <p className="text-sm text-sib-muted mt-1 leading-relaxed">
          Buy and sell second-hand in Malta with confidence. Every transaction is protected.
        </p>
      </div>

      {/* Trust banner */}
      <div className="mx-4 mb-6 p-3.5 rounded-2xl bg-sib-primary/5 border border-sib-primary/10 flex items-center gap-3">
        <ShieldCheck size={20} className="text-sib-primary flex-shrink-0" />
        <p className="text-xs font-semibold text-sib-text leading-relaxed">
          Every purchase on Sib is protected by our Buyer Protection guarantee.
        </p>
      </div>

      {/* ── Buying ──────────────────────────────────────────── */}
      <section className="px-4 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-sib-secondary/10 flex items-center justify-center">
            <Package size={16} className="text-sib-secondary" />
          </div>
          <h2 className="text-lg font-bold text-sib-text">Buying on Sib</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              step: 1,
              icon: Tag,
              title: 'Find something you love',
              desc: 'Browse by category, style, or search for specific items. Save your favourites and make offers.',
            },
            {
              step: 2,
              icon: CreditCard,
              title: 'Pay securely',
              desc: 'Checkout through Sib. Your payment is held safely in escrow — the seller never receives money directly until you confirm delivery.',
            },
            {
              step: 3,
              icon: Truck,
              title: 'Tracked delivery across Malta',
              desc: 'The seller ships your item using Sib Tracked Delivery. You can track your parcel in real time, with delivery in 1–3 working days.',
            },
            {
              step: 4,
              icon: CheckCircle,
              title: 'Confirm & rate',
              desc: 'Once your item arrives, confirm delivery. The seller gets paid, and you can leave a review. If something\'s wrong, open a dispute within 48 hours.',
            },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sib-secondary/10 flex items-center justify-center text-xs font-bold text-sib-secondary">
                  {step}
                </div>
                {step < 4 && <div className="w-px flex-1 bg-sib-stone mt-1" />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} className="text-sib-secondary" />
                  <p className="text-sm font-bold text-sib-text">{title}</p>
                </div>
                <p className="text-xs text-sib-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-sib-stone mx-4 mb-8" />

      {/* ── Selling ─────────────────────────────────────────── */}
      <section className="px-4 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-sib-primary/10 flex items-center justify-center">
            <Camera size={16} className="text-sib-primary" />
          </div>
          <h2 className="text-lg font-bold text-sib-text">Selling on Sib</h2>
        </div>

        <div className="space-y-3">
          {[
            {
              step: 1,
              icon: Camera,
              title: 'List your item',
              desc: 'Snap a few photos, add a title, description, price, and condition. Your listing goes live instantly.',
            },
            {
              step: 2,
              icon: MessageSquare,
              title: 'Chat with buyers',
              desc: 'Buyers can message you, ask questions, and make offers. Accept, counter, or decline — it\'s up to you.',
            },
            {
              step: 3,
              icon: Truck,
              title: 'Ship with Sib',
              desc: 'When an item sells, you\'ll get a prepaid shipping label. Drop your parcel at any MaltaPost branch. Tracked delivery is included.',
            },
            {
              step: 4,
              icon: Banknote,
              title: 'Get paid',
              desc: 'Once the buyer confirms delivery (or after 48 hours), your earnings become available. Payouts are sent every Tuesday and Friday to your bank account.',
            },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-sib-primary/10 flex items-center justify-center text-xs font-bold text-sib-primary">
                  {step}
                </div>
                {step < 4 && <div className="w-px flex-1 bg-sib-stone mt-1" />}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} className="text-sib-primary" />
                  <p className="text-sm font-bold text-sib-text">{title}</p>
                </div>
                <p className="text-xs text-sib-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-sib-stone mx-4 mb-8" />

      {/* ── Key Features ────────────────────────────────────── */}
      <section className="px-4 mb-8">
        <h2 className="text-lg font-bold text-sib-text mb-4">Why Sib is Safer</h2>

        <div className="grid grid-cols-1 gap-3">
          {[
            {
              icon: CreditCard,
              title: 'Secure Payments',
              desc: 'All payments go through Sib. Your card details are encrypted and never shared with sellers.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: ShieldCheck,
              title: 'Buyer Protection',
              desc: 'If your item doesn\'t arrive, arrives damaged, or doesn\'t match the listing, you\'re covered. We\'ll refund you.',
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              icon: Truck,
              title: 'Tracked Delivery',
              desc: 'Every order ships with tracked delivery across Malta. Know exactly where your parcel is at all times.',
              color: 'bg-amber-50 text-amber-600',
            },
            {
              icon: Banknote,
              title: 'Seller Payouts',
              desc: 'Earnings are held securely in escrow until delivery is confirmed. Payouts are sent to your bank every Tuesday and Friday.',
              color: 'bg-purple-50 text-purple-600',
            },
            {
              icon: Clock,
              title: '48-Hour Window',
              desc: 'Buyers have 48 hours after delivery to confirm the item or raise a dispute. After that, funds are automatically released to the seller.',
              color: 'bg-sky-50 text-sky-600',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-3.5 rounded-xl border border-sib-stone/50 bg-white flex gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-sib-text mb-0.5">{title}</p>
                <p className="text-xs text-sib-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-sib-stone mx-4 mb-8" />

      {/* ── Disputes & Refunds ──────────────────────────────── */}
      <section className="px-4 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-sib-text">Disputes & Refunds</h2>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-sib-sand border border-sib-stone/50">
            <p className="text-sm font-semibold text-sib-text mb-1">When can I open a dispute?</p>
            <p className="text-xs text-sib-muted leading-relaxed">
              You can open a dispute within 48 hours of receiving your item if it doesn't match the listing description,
              is damaged, or is the wrong item. You can also dispute if your item never arrives.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-sib-sand border border-sib-stone/50">
            <p className="text-sm font-semibold text-sib-text mb-1">What happens during a dispute?</p>
            <p className="text-xs text-sib-muted leading-relaxed">
              Sib reviews the dispute, communicates with both buyer and seller, and makes a fair decision.
              During a dispute, the seller's payout is held until a resolution is reached.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-sib-sand border border-sib-stone/50">
            <p className="text-sm font-semibold text-sib-text mb-1">How do refunds work?</p>
            <p className="text-xs text-sib-muted leading-relaxed">
              If your dispute is upheld, you'll receive a full refund to your original payment method.
              Refunds are typically processed within 3–5 working days.
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTAs ─────────────────────────────────────── */}
      <div className="px-4 space-y-2.5">
        <button
          onClick={() => navigate('/browse')}
          className="w-full py-3.5 rounded-2xl bg-sib-secondary text-white text-sm font-bold active:scale-[0.98] transition-transform hover:bg-sib-secondary/90"
        >
          Start Browsing
        </button>
        <button
          onClick={() => navigate('/buyer-protection')}
          className="w-full py-3 rounded-2xl border border-sib-stone text-sib-text text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-sib-sand transition-colors"
        >
          <ShieldCheck size={14} className="text-sib-primary" />
          Buyer Protection Details
        </button>
        <button
          onClick={() => navigate('/faq')}
          className="w-full py-3 rounded-2xl border border-sib-stone text-sib-text text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-sib-sand transition-colors"
        >
          FAQs
          <ChevronRight size={14} className="text-sib-muted" />
        </button>
      </div>
    </div>
  )
}
