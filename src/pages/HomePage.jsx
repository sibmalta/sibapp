import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Zap, ChevronRight, Flame, Eye, Sparkles, Tag, Search,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import useScrollRestore from '../hooks/useScrollRestore'
import PickedForYou from '../components/PickedForYou'
import useForYou from '../hooks/useForYou'
import useAuthNav from '../hooks/useAuthNav'
import CategoryBento from '../components/CategoryBento'
import { CATEGORY_TREE, resolveCategory } from '../data/categories'
import { getHistory, hasActivity } from '../lib/browsingHistory'

/* ── Category image map — curated Unsplash photos keyed by category id ── */
const CATEGORY_IMAGES = {
  fashion:     'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=600&fit=crop&q=75',
  electronics: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop&q=75',
  books:       'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop&q=75',
  sports:      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=600&fit=crop&q=75',
  home:        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&h=600&fit=crop&q=75',
  furniture:   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=500&fit=crop&crop=center&q=75',
  toys:        'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&h=600&fit=crop&crop=center&q=75',
  kids:        'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&h=600&fit=crop&q=75',
}

/* ── Per-category focal points for precise object-position ── */
const CATEGORY_FOCAL = {
  fashion:     'center 30%',
  electronics: 'center 40%',
  books:       'center center',
  sports:      'center 40%',
  home:        'center center',
  furniture:   'center 60%',
  toys:        'center center',
  kids:        'center 35%',
}


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
  const { listings, listingsLoading } = useApp()
  const navigate = useNavigate()
  const authNav = useAuthNav()
  const [mobileSearch, setMobileSearch] = useState('')

  useScrollRestore('/')

  const activeListings = listings.filter(l => l.status === 'active')
  const boostedListings = activeListings.filter(l => l.boosted)

  const freshListings = useMemo(() => {
    return [...activeListings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
  }, [activeListings])

  const handleMobileSearch = (e) => {
    e.preventDefault()
    const query = mobileSearch.trim()
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : '/browse')
  }

  // ── Live counts per top-level category (supports legacy mapping) ────
  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const l of activeListings) {
      const resolved = resolveCategory(l.category)
      if (resolved) counts[resolved] = (counts[resolved] || 0) + 1
    }
    return counts
  }, [activeListings])

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
      // Category matching — resolve legacy categories for fair comparison
      if (listing.category) {
        const resolved = resolveCategory(listing.category)
        if (h.categories.some(c => c === listing.category.toLowerCase() || resolveCategory(c) === resolved)) score += 3
      }
      if (listing.brand && h.brands.some(b => listing.brand.toLowerCase() === b)) score += 4
      // Style matching (still useful for fashion listings)
      if (h.styles?.length > 0) {
        const listingStyles = listing.manualStyleTags?.length ? listing.manualStyleTags : (listing.styleTags || [])
        for (const s of h.styles) {
          if (listingStyles.includes(s)) { score += 3; break }
        }
      }
      if (h.searches?.length > 0) {
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

  // ── Category click handler ────────────────────────────────
  const handleCategoryClick = (categoryId) => {
    navigate(`/browse?cat=${categoryId}`)
  }

  return (
    <div className="pb-4 lg:max-w-7xl lg:mx-auto bg-[#FAFAF9]">
      <section className="lg:hidden bg-white px-4 pt-3 pb-4 border-b border-sib-stone/50">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sib-muted font-bold">Sib marketplace</p>
            <h1 className="text-[22px] font-extrabold text-sib-text leading-tight tracking-tight">Find your next pre-loved thing</h1>
          </div>
          <button
            onClick={() => authNav('/sell')}
            className="flex-shrink-0 rounded-full bg-sib-primary px-4 py-2 text-xs font-bold text-white active:scale-95 transition-transform"
          >
            Sell
          </button>
        </div>

        <form onSubmit={handleMobileSearch} className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sib-muted pointer-events-none" />
          <input
            value={mobileSearch}
            onChange={e => setMobileSearch(e.target.value)}
            placeholder="Search brands, styles, items..."
            className="w-full rounded-2xl border border-sib-stone bg-sib-sand/70 py-3 pl-10 pr-4 text-sm font-medium text-sib-text placeholder-sib-muted outline-none focus:border-sib-primary focus:bg-white transition-colors"
          />
        </form>
      </section>

      {listingsLoading ? (
        <section className="lg:hidden pt-4">
          <ListingRowSkeleton />
        </section>
      ) : freshListings.length > 0 && (
        <section className="lg:hidden pt-4 pb-1">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-[17px] font-extrabold text-sib-text tracking-tight">Fresh finds</h2>
            <button onClick={() => navigate('/browse?sort=newest')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {freshListings.slice(0, 6).map(listing => (
              <div key={listing.id} className="flex-shrink-0 w-36">
                <ListingCard listing={listing} size="small" />
              </div>
            ))}
          </div>
        </section>
      )}
      {/* ── Hero — typography-driven ────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-white lg:block">
        {/* Subtle ambient glow accents */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #C68A2E 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #C68A2E 0%, transparent 70%)' }} />

        <div className="relative px-5 pt-14 pb-12 lg:max-w-5xl lg:mx-auto lg:px-12 lg:pt-20 lg:pb-16">
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.3em] text-sib-muted font-semibold mb-4 lg:text-[12px] lg:mb-5">
            Sib — Malta's marketplace
          </p>

          {/* Headline */}
          <h1 className="text-[38px] font-extrabold leading-[1.04] tracking-tight text-sib-text mb-5 max-w-[340px] sm:text-[46px] sm:max-w-[420px] md:text-[56px] md:max-w-[520px] lg:text-[72px] lg:max-w-[700px] xl:text-[82px] xl:max-w-[800px] lg:mb-7">
            Discover pre&#8209;loved things you'll love
          </h1>

          {/* Subtext */}
          <p className="text-[14px] text-sib-muted leading-[1.6] font-medium mb-8 max-w-[380px] sm:text-[15px] lg:text-[18px] lg:max-w-[500px] lg:mb-10">
            Buy and sell second-hand with secure payments, tracked delivery, and buyer protection across Malta.
          </p>

          {/* CTAs */}
          <div className="flex gap-3.5 sm:gap-4">
            <button
              onClick={() => authNav('/sell')}
              className="bg-sib-secondary text-white font-bold text-[15px] py-4 px-7 rounded-2xl shadow-lg active:scale-95 transition-transform sm:text-base sm:px-9 sm:py-[18px] lg:text-[17px] lg:px-10 lg:py-5 hover:bg-sib-secondary/90"
            >
              Sell an Item
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="border border-sib-text/12 text-sib-text font-semibold text-[15px] py-4 px-7 rounded-2xl active:scale-95 transition-transform bg-white sm:text-base sm:px-9 sm:py-[18px] lg:text-[17px] lg:px-10 lg:py-5 hover:bg-gray-50"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* ── Browse by Category — bento / masonry layout ────────── */}
      <section className="pt-4 pb-2 lg:pt-6 lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 mb-2.5 lg:mb-3.5 lg:px-0 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold text-sib-text tracking-tight lg:text-xl">Browse by Category</h2>
            <p className="hidden text-[11px] text-sib-muted mt-0.5 font-medium lg:block lg:text-xs">Find exactly what you're looking for</p>
          </div>
          <button onClick={() => navigate('/browse')} className="text-xs font-semibold text-sib-primary flex items-center gap-0.5 lg:text-sm">
            View all <ArrowRight size={12} />
          </button>
        </div>

        <CategoryBento
          categories={CATEGORY_TREE}
          images={CATEGORY_IMAGES}
          focalPoints={CATEGORY_FOCAL}
          counts={categoryCounts}
          loading={listingsLoading}
          onCategoryClick={handleCategoryClick}
        />
      </section>

      {/* ── Sell Banner — high-visibility conversion strip ─────── */}
      <section className="hidden mt-5 mb-2 px-4 lg:block lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="rounded-2xl bg-[#F3F1EC] px-5 py-7 sm:py-9 md:py-10 lg:px-10 lg:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8">
          <div className="min-w-0">
            <h2 className="text-[24px] sm:text-[28px] lg:text-[32px] font-extrabold text-sib-text leading-tight tracking-tight">
              Sell for free
            </h2>
            <p className="text-[14px] sm:text-[15px] lg:text-base text-sib-muted mt-1.5 leading-relaxed max-w-md">
              No fees. No hassle. List in under a minute — we handle delivery.
            </p>
          </div>
          <button
            onClick={() => authNav('/sell')}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:py-4 rounded-full bg-sib-primary text-white text-[15px] sm:text-base font-bold shadow-sm hover:bg-sib-primary/90 active:scale-[0.97] transition-all flex-shrink-0 self-start md:self-center"
          >
            Sell an item
            <ChevronRight size={17} strokeWidth={2.5} className="flex-shrink-0" />
          </button>
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
                : <Tag size={15} className="text-sib-secondary" />}
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


    </div>
  )
}
