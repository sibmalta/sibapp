import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap, Tag, ChevronRight, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'

export default function HomePage() {
  const { listings, currentUser } = useApp()
  const navigate = useNavigate()

  const activeListings = listings.filter(l => l.status === 'active')
  const boostedListings = activeListings.filter(l => l.boosted)
  const newArrivals = [...activeListings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)

  return (
    <div className="pb-4">
      {/* Hero — modern gradient with floating blobs */}
      <div className="relative overflow-hidden hero-grain" style={{
        background: 'linear-gradient(155deg, #F5F5F0 0%, #EEEDEA 30%, #E8E6E1 55%, #ECEAE6 80%, #F3F2EF 100%)',
      }}>
        {/* Floating gradient blobs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 animate-blob"
          style={{ background: 'radial-gradient(circle, #B59A1B 0%, transparent 70%)' }} />
        <div className="absolute top-16 -left-16 w-40 h-40 rounded-full opacity-12 animate-blob-alt"
          style={{ background: 'radial-gradient(circle, #6B7280 0%, transparent 70%)' }} />
        <div className="absolute -bottom-8 right-8 w-36 h-36 rounded-full opacity-10 animate-blob"
          style={{ background: 'radial-gradient(circle, #374151 0%, transparent 70%)', animationDelay: '2s' }} />

        {/* Logo */}
        <div className="relative flex justify-center px-6 pt-6 pb-1 animate-fade-up">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-1.png`}
            alt="Sib"
            className="w-44"
          />
        </div>

        {/* Decorative shimmer line */}
        <div className="relative mx-auto w-28 h-[1px] my-2 overflow-hidden rounded-full bg-sib-stone/30">
          <div className="absolute inset-0 w-1/2 animate-shimmer"
            style={{ background: 'linear-gradient(90deg, transparent, #B59A1B55, transparent)' }} />
        </div>

        {/* Headline + subtext + CTAs */}
        <div className="relative px-5 pb-6 pt-1.5 animate-fade-up-delay">
          <h1 className="text-[26px] font-extrabold leading-tight text-center mb-2.5 tracking-tight text-sib-text">
            Malta's easiest way to buy<br />& sell pre-loved items
          </h1>
          <p className="text-center text-[11px] text-sib-muted mb-6 tracking-wide font-medium">
            Secure payments · Tracked delivery · Full buyer protection
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(currentUser ? '/sell' : '/auth')}
              className="flex-[1.2] bg-sib-secondary text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
            >
              Sell an Item
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="flex-1 border border-sib-text/15 text-sib-text font-semibold text-sm py-3.5 rounded-2xl active:scale-95 transition-transform bg-white/50 backdrop-blur-sm"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="bg-sib-primary/5 border-b border-sib-stone">
        <div className="flex divide-x divide-sib-stone">
          {[
            { icon: ShieldCheck, label: 'Buyer Protection', sub: 'Every purchase protected' },
            { icon: Truck, label: 'Tracked Delivery', sub: '1–3 working days' },
            { icon: CreditCard, label: 'Secure Payments', sub: 'Safe & reliable checkout' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2">
              <Icon size={16} className="text-sib-primary mb-0.5" />
              <span className="text-[10px] font-bold text-sib-text text-center leading-tight">{label}</span>
              <span className="text-[9px] text-sib-muted text-center">{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured listings (boosted) ─────────────────────────────── */}
      <section className="px-4 pt-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Zap size={15} className="text-sib-primary fill-sib-primary" />
            <h2 className="text-base font-bold text-sib-text">Featured</h2>
          </div>
          <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-medium">
            See all <ArrowRight size={13} />
          </button>
        </div>
        <p className="text-[11px] text-sib-muted mb-3">Items getting extra visibility on Sib</p>

        {boostedListings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-sib-stone bg-sib-sand/60 px-5 py-8 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-sib-primary/10 flex items-center justify-center mb-1">
              <Zap size={20} className="text-sib-primary fill-sib-primary/30" />
            </div>
            <p className="text-sm font-semibold text-sib-text">No featured listings yet</p>
            <p className="text-xs text-sib-muted leading-relaxed">
              Boost your listing to appear here and reach more buyers across Malta.
            </p>
            <button
              onClick={() => navigate(currentUser ? '/sell' : '/auth')}
              className="mt-2 bg-sib-secondary text-white text-xs font-bold px-5 py-2 rounded-full active:scale-95 transition-transform"
            >
              List an Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {boostedListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Sell CTA banner */}
        {boostedListings.length > 0 && (
          <button
            onClick={() => navigate(currentUser ? '/sell' : '/auth')}
            className="mt-4 w-full rounded-2xl bg-sib-secondary text-white px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="text-left">
              <p className="text-sm font-bold">Have something to sell?</p>
              <p className="text-[11px] text-white/80 mt-0.5">List it in minutes — we handle delivery</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" />
          </button>
        )}
      </section>

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-base font-bold text-sib-text flex items-center gap-1.5">
              <Tag size={15} className="text-sib-primary" />
              Just Listed
            </h2>
            <button onClick={() => navigate('/browse?sort=newest')} className="flex items-center gap-1 text-xs text-sib-primary font-medium">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {newArrivals.map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA for unauthenticated users */}
      {!currentUser && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
          <p className="text-sm font-bold text-sib-text mb-1">Ready to declutter?</p>
          <p className="text-xs text-sib-muted mb-3 leading-relaxed">Join Sib and start selling your pre-loved fashion to buyers across Malta.</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-sib-secondary text-white font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform"
          >
            Create a Free Account
          </button>
        </div>
      )}
    </div>
  )
}
