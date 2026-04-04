import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Zap, ChevronRight, Flame, Eye, Sparkles,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import useScrollRestore from '../hooks/useScrollRestore'
import PickedForYou from '../components/PickedForYou'
import useForYou from '../hooks/useForYou'
import { classifyListing } from '../lib/styleClassifier'
import { getHistory, hasActivity, trackStyle } from '../lib/browsingHistory'



/* ── Shop by Style — editorial photo tiles ──────────────── */
/*
 * LAYOUT STRUCTURE (Desktop — 4 cols × 3 rows):
 *
 *  Row 1 │ Vintage ↕  │ Streetwear │ Y2K  ←  wide  →  │
 *  Row 2 │ Vintage ↕  │ Designer   │ Minimal ↕ │ Everyday │
 *  Row 3 │ Sport  ←  wide  →       │ Minimal ↕ │ Boho     │
 *
 * LAYOUT STRUCTURE (Mobile — 2 cols × 5 rows):
 *
 *  Row 1 │ Vintage ↕  │ Streetwear │
 *  Row 2 │ Vintage ↕  │ Y2K        │
 *  Row 3 │ Designer   │ Minimal ↕  │
 *  Row 4 │ Everyday   │ Minimal ↕  │
 *  Row 5 │ Sport  ←  wide  →       │
 *
 * Hero tiles:    Vintage (tall), Minimal (tall)
 * Landscape:     Y2K (wide desktop), Sport (wide both)
 * Supporting:    Streetwear, Designer, Everyday, Boho
 */
const STYLE_TILES = [
  {
    id: 'vintage',
    label: 'Vintage',
    subtitle: 'Retro treasures & timeless pieces',
    img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1 row-span-2',
    desktop: 'col-span-1 row-span-2',
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    subtitle: 'Urban edge & hype drops',
    img: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1',
    desktop: 'col-span-1',
  },
  {
    id: 'y2k',
    label: '00s',
    subtitle: 'Y2K nostalgia & early-2000s vibes',
    img: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1',
    desktop: 'col-span-2',
  },
  {
    id: 'designer',
    label: 'Designer',
    subtitle: 'Luxury labels for less',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1',
    desktop: 'col-span-1',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    subtitle: 'Clean lines & quiet luxury',
    img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1 row-span-2',
    desktop: 'col-span-1 row-span-2',
  },
  {
    id: 'basics',
    label: 'Everyday',
    subtitle: 'Wardrobe staples that work',
    img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-1',
    desktop: 'col-span-1',
  },
  {
    id: 'sporty',
    label: 'Sport',
    subtitle: 'Activewear & athleisure',
    img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'col-span-2',
    desktop: 'col-span-2',
  },
  {
    id: 'boho',
    label: 'Boho',
    subtitle: 'Free-spirited & effortless style',
    img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80&fit=crop&crop=faces,center',
    mobile: 'hidden',
    desktop: 'col-span-1',
  },
]

function ListingRowSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 pb-1 lg:hidden">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex-shrink-0 w-36">
          <div className="rounded-xl bg-gray-200 animate-pulse h-[180px] w-full" />
          <div className="h-3 w-24 bg-gray-200 rounded mt-2 animate-pulse" />
          <div className="h-3 w-14 bg-gray-100 rounded mt-1 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { listings, listingsLoading, currentUser } = useApp()
  const navigate = useNavigate()

  useScrollRestore('/')

  const activeListings = listings.filter(l => l.status === 'active')
  const boostedListings = activeListings.filter(l => l.boosted)

  // ── "For You" personalised hook (DB-backed) ───────────────
  const { forYou, isPersonalised: forYouPersonalised } = useForYou()

  // ── Continue browsing — personalised from history ─────────
  const continueBrowsing = useMemo(() => {
    if (!hasActivity()) return []
    const h = getHistory()
    const scored = new Map()

    for (const listing of activeListings) {
      let score = 0
      if (h.viewedIds.includes(listing.id)) score -= 100
      if (listing.category && h.categories.includes(listing.category.toLowerCase())) score += 3
      if (listing.brand && h.brands.some(b => listing.brand.toLowerCase() === b)) score += 4
      if (h.styles.length > 0) {
        const listingStyles = classifyListing(listing)
        for (const s of h.styles) {
          if (listingStyles.includes(s)) { score += 3; break }
        }
      }
      if (h.searches.length > 0) {
        const text = `${listing.title} ${listing.description || ''} ${listing.brand || ''}`.toLowerCase()
        for (const q of h.searches) {
          if (text.includes(q)) { score += 2; break }
        }
      }
      if (score > 0) scored.set(listing.id, { listing, score })
    }

    return [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.listing)
  }, [activeListings])

  // ── Trending Now — high-view + recent listings ───────────
  const trendingNow = useMemo(() => {
    if (activeListings.length === 0) return []
    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000
    return [...activeListings]
      .map(l => {
        const age = now - new Date(l.createdAt).getTime()
        const recency = age < 2 * DAY ? 5 : age < 7 * DAY ? 3 : age < 14 * DAY ? 1 : 0
        return { listing: l, score: (l.views || 0) * 2 + recency + (l.saves || 0) * 3 }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.listing)
  }, [activeListings])

  // ── Style click handler ────────────────────────────────────
  const handleStyleClick = (styleId) => {
    trackStyle(styleId)
    navigate(`/browse?style=${styleId}`)
  }

  return (
    <div className="pb-4 lg:max-w-7xl lg:mx-auto bg-[#FAFAF9]">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #C68A2E 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -left-12 w-44 h-44 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #6B7280 0%, transparent 70%)' }} />

        <div className="relative px-5 pt-12 pb-6 lg:max-w-4xl lg:mx-auto lg:px-10 lg:py-14 lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="lg:flex-1 animate-fade-up-delay">
            <p className="text-[10px] uppercase tracking-[0.25em] text-sib-muted font-semibold mb-2.5 text-center lg:text-left lg:text-[11px]">Malta's fashion marketplace</p>
            <h1 className="text-[26px] font-extrabold leading-[1.12] text-center mb-2.5 tracking-tight text-sib-text lg:text-[40px] xl:text-5xl lg:text-left lg:mb-4">
              Discover pre-loved<br className="lg:hidden" /> fashion you'll love
            </h1>
            <p className="text-center text-[12px] text-sib-muted mb-5 leading-relaxed font-medium max-w-[300px] mx-auto lg:text-[15px] lg:text-left lg:mb-8 lg:max-w-none lg:mx-0">
              Buy and sell second-hand with secure payments, tracked delivery, and buyer protection.
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
              className="flex-1 border border-sib-text/12 text-sib-text font-semibold text-sm py-3 rounded-2xl active:scale-95 transition-transform bg-white lg:flex-none lg:py-4 lg:text-base hover:bg-gray-50"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* ── Shop by Style — editorial photo grid ────────────── */}
      <section className="pt-6 pb-2 lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 mb-3 lg:px-0 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold text-sib-text tracking-tight lg:text-xl">Shop by Style</h2>
            <p className="text-[11px] text-sib-muted mt-0.5 font-medium lg:text-xs">Curated edits for every look</p>
          </div>
          <button onClick={() => navigate('/browse')} className="text-xs font-semibold text-sib-primary flex items-center gap-0.5 lg:text-sm">
            View all <ArrowRight size={12} />
          </button>
        </div>

        {/* ── Mobile: 2-col editorial grid (5 rows, mixed sizes) ── */}
        <div className="grid grid-cols-2 gap-2 px-4 auto-rows-[132px] lg:hidden">
          {STYLE_TILES.filter(t => t.mobile !== 'hidden').map(tile => (
            <button
              key={tile.id}
              onClick={() => handleStyleClick(tile.id)}
              className={`relative overflow-hidden rounded-2xl active:scale-[0.97] transition-transform ${tile.mobile}`}
            >
              <img
                src={tile.img}
                alt={tile.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
              {/* Refined gradient: stronger at bottom for text, soft fade upward */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 via-[40%] to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-3">
                <p className="text-white font-extrabold text-[15px] leading-tight tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">{tile.label}</p>
                <p className="text-white/65 text-[10px] font-medium mt-0.5 leading-snug">{tile.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Desktop: 4-col editorial grid (3 rows, mixed sizes) ── */}
        <div className="hidden lg:grid lg:grid-cols-4 lg:gap-2.5 auto-rows-[150px]">
          {STYLE_TILES.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleStyleClick(tile.id)}
              className={`relative overflow-hidden rounded-2xl transition-all group hover:shadow-xl ${tile.desktop}`}
            >
              <img
                src={tile.img}
                alt={tile.label}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                draggable={false}
              />
              {/* Refined gradient: deeper bottom shelf for crisp text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 via-[38%] to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="text-white font-extrabold text-lg leading-tight tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">{tile.label}</p>
                <p className="text-white/60 text-[11px] font-medium mt-0.5 leading-snug">{tile.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Trending Now ──────────────────────────────────────── */}
      {listingsLoading ? (
        <ListingRowSkeleton />
      ) : trendingNow.length > 0 && (
        <section className="pt-6 pb-2 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between px-4 mb-1 lg:px-0">
            <div className="flex items-center gap-1.5">
              <Flame size={15} className="text-sib-secondary" />
              <h2 className="text-[17px] font-extrabold text-sib-text tracking-tight lg:text-xl">Trending Now</h2>
            </div>
            <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <p className="px-4 text-[11px] text-sib-muted mb-3 font-medium lg:px-0 lg:text-xs">Most viewed &amp; saved across Malta right now</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
            {trendingNow.slice(0, 6).map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {trendingNow.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── For You (DB-backed personalisation) ────────────────── */}
      {forYou.length > 0 && (
        <section className="pt-6 mb-3 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between px-4 mb-1 lg:px-0">
            <div className="flex items-center gap-1.5">
              {forYouPersonalised
                ? <Sparkles size={15} className="text-sib-primary" />
                : <Flame size={15} className="text-sib-secondary" />}
              <h2 className="text-[15px] font-extrabold text-sib-text lg:text-lg">
                {forYouPersonalised ? 'For You' : 'Just Listed'}
              </h2>
            </div>
            <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <p className="px-4 text-[11px] text-sib-muted mb-3 lg:px-0 lg:text-xs">
            {forYouPersonalised ? 'Personalised picks based on your activity' : 'Fresh arrivals across Malta'}
          </p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
            {forYou.slice(0, 6).map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {forYou.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── Continue Browsing (personalised — only if history) ── */}
      {continueBrowsing.length > 0 && (
        <section className="pt-4 mb-3 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between px-4 mb-1 lg:px-0">
            <div className="flex items-center gap-1.5">
              <Eye size={15} className="text-sib-primary" />
              <h2 className="text-[15px] font-extrabold text-sib-text lg:text-lg">Continue Browsing</h2>
            </div>
            <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <p className="px-4 text-[11px] text-sib-muted mb-3 lg:px-0 lg:text-xs">Based on what you've been looking at</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
            {continueBrowsing.slice(0, 6).map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {continueBrowsing.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── Picked for You / Trending ─────────────────────────── */}
      <PickedForYou />

      {/* ── Featured (boosted) — compact row ──────────────────── */}
      {boostedListings.length > 0 && (
        <section className="mb-5 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between px-4 mb-1 lg:px-0">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-sib-primary fill-sib-primary" />
              <h2 className="text-[15px] font-extrabold text-sib-text lg:text-lg">Featured</h2>
            </div>
            <button onClick={() => navigate('/browse')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <p className="px-4 text-[11px] text-sib-muted mb-3 lg:px-0 lg:text-xs">Boosted for extra visibility</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
            {boostedListings.slice(0, 6).map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {boostedListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sell CTA ──────────────────────────────────────────── */}
      <section className="px-4 mb-5 lg:max-w-lg lg:mx-auto">
        <button
          onClick={() => navigate(currentUser ? '/sell' : '/auth')}
          className="w-full rounded-2xl bg-sib-secondary text-white px-4 py-3.5 flex items-center justify-between active:scale-[0.98] transition-transform shadow-sm hover:bg-sib-secondary/90"
        >
          <div className="text-left">
            <p className="text-sm font-bold">Have something to sell?</p>
            <p className="text-[11px] text-white/80 mt-0.5">List it in minutes — we handle delivery</p>
          </div>
          <ChevronRight size={18} className="flex-shrink-0" />
        </button>
      </section>

      {/* ── Bottom CTA for unauthenticated users ──────────────── */}
      {!currentUser && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-white border border-gray-200/80 lg:max-w-lg lg:mx-auto lg:p-6">
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
