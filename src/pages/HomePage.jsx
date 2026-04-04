import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap, Tag, ChevronRight, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import useScrollRestore from '../hooks/useScrollRestore'
import PickedForYou from '../components/PickedForYou'

export default function HomePage() {
  const { listings, currentUser } = useApp()
  const navigate = useNavigate()

  // Restore scroll position when returning from listing detail
  useScrollRestore('/')

  const activeListings = listings.filter(l => l.status === 'active')
  const boostedListings = activeListings.filter(l => l.boosted)
  const newArrivals = [...activeListings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)

  return (
    <div className="pb-4 lg:max-w-7xl lg:mx-auto">
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

        {/* Headline + subtext + CTAs — compact mobile, spacious desktop */}
        <div className="relative px-5 pt-14 pb-5 animate-fade-up-delay lg:max-w-4xl lg:mx-auto lg:px-10 lg:py-12 lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="lg:flex-1">
            <h1 className="text-[24px] font-extrabold leading-[1.2] text-center mb-1.5 tracking-tight text-sib-text lg:text-4xl xl:text-5xl lg:text-left lg:mb-4">
              Malta's easiest way to buy<br className="lg:hidden" />{' '}& sell pre-loved items
            </h1>
            <p className="text-center text-[11px] text-sib-muted mb-4 tracking-wide font-medium lg:text-sm lg:text-left lg:mb-8">
              Secure payments · Tracked delivery · Full buyer protection
            </p>
          </div>
          <div className="flex gap-3 lg:flex-col lg:w-56 lg:flex-shrink-0">
            <button
              onClick={() => navigate(currentUser ? '/sell' : '/auth')}
              className="flex-[1.2] bg-sib-secondary text-white font-bold text-sm py-3 rounded-2xl shadow-lg active:scale-95 transition-transform lg:flex-none lg:py-4 lg:text-base hover:bg-sib-secondary/90"
            >
              Sell an Item
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="flex-1 border border-sib-text/15 text-sib-text font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform bg-white/50 backdrop-blur-sm lg:flex-none lg:py-4 lg:text-base hover:bg-white/80"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div className="bg-sib-primary/5 border-b border-sib-stone">
        <div className="flex divide-x divide-sib-stone lg:max-w-5xl lg:mx-auto">
          {[
            { icon: ShieldCheck, label: 'Buyer Protection', sub: 'Every purchase protected' },
            { icon: Truck, label: 'Tracked Delivery', sub: '1–3 working days' },
            { icon: CreditCard, label: 'Secure Payments', sub: 'Safe & reliable checkout' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2 lg:flex-row lg:gap-3 lg:py-4 lg:justify-center">
              <Icon size={16} className="text-sib-primary mb-0.5 lg:mb-0 lg:w-5 lg:h-5" />
              <div className="lg:text-left">
                <span className="text-[10px] font-bold text-sib-text text-center leading-tight lg:text-xs block">{label}</span>
                <span className="text-[9px] text-sib-muted text-center lg:text-[11px] block">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured listings (boosted) ─────────────────────────────── */}
      <section className="px-4 pt-5 mb-6 lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Zap size={15} className="text-sib-primary fill-sib-primary" />
            <h2 className="text-base font-bold text-sib-text lg:text-lg">Featured</h2>
          </div>
          <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-medium lg:text-sm">
            See all <ArrowRight size={13} />
          </button>
        </div>
        <p className="text-[11px] text-sib-muted mb-3 lg:text-xs lg:mb-4">Items getting extra visibility on Sib</p>

        {boostedListings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-sib-stone bg-sib-sand/60 px-5 py-8 flex flex-col items-center text-center gap-2 lg:py-12">
            <div className="w-10 h-10 rounded-full bg-sib-primary/10 flex items-center justify-center mb-1">
              <Zap size={20} className="text-sib-primary fill-sib-primary/30" />
            </div>
            <p className="text-sm font-semibold text-sib-text">No featured listings yet</p>
            <p className="text-xs text-sib-muted leading-relaxed">
              Boost your listing to appear here and reach more buyers across Malta.
            </p>
            <button
              onClick={() => navigate(currentUser ? '/sell' : '/auth')}
              className="mt-2 bg-sib-secondary text-white text-xs font-bold px-5 py-2 rounded-full active:scale-95 transition-transform hover:bg-sib-secondary/90"
            >
              List an Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            {boostedListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Sell CTA banner */}
        {boostedListings.length > 0 && (
          <button
            onClick={() => navigate(currentUser ? '/sell' : '/auth')}
            className="mt-4 w-full rounded-2xl bg-sib-secondary text-white px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm lg:max-w-lg lg:mx-auto lg:mt-6 hover:bg-sib-secondary/90"
          >
            <div className="text-left">
              <p className="text-sm font-bold">Have something to sell?</p>
              <p className="text-[11px] text-white/80 mt-0.5">List it in minutes — we handle delivery</p>
            </div>
            <ChevronRight size={18} className="flex-shrink-0" />
          </button>
        )}
      </section>

      {/* ── Picked for you / Trending ──────────────────────────────── */}
      <PickedForYou />

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      {newArrivals.length > 0 && (
        <section className="mb-6 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between px-4 mb-3 lg:px-0">
            <h2 className="text-base font-bold text-sib-text flex items-center gap-1.5 lg:text-lg">
              <Tag size={15} className="text-sib-primary" />
              Just Listed
            </h2>
            <button onClick={() => navigate('/browse?sort=newest')} className="flex items-center gap-1 text-xs text-sib-primary font-medium lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
            {newArrivals.map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-6 lg:gap-4">
            {newArrivals.map(listing => (
              <ListingCard key={listing.id} listing={listing} size="small" />
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA for unauthenticated users */}
      {!currentUser && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-sib-warm border border-sib-stone lg:max-w-lg lg:mx-auto lg:p-6">
          <p className="text-sm font-bold text-sib-text mb-1">Ready to declutter?</p>
          <p className="text-xs text-sib-muted mb-3 leading-relaxed">Join Sib and start selling your pre-loved fashion to buyers across Malta.</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-sib-secondary text-white font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform hover:bg-sib-secondary/90"
          >
            Create a Free Account
          </button>
        </div>
      )}
    </div>
  )
}
