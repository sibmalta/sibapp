import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Zap, ChevronRight, Flame, Eye, Sparkles, Tag,
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
  const { listings, listingsLoading, currentUser } = useApp()
  const navigate = useNavigate()
  const authNav = useAuthNav()

  useScrollRestore('/')

  const activeListings = listings.filter(l => l.status === 'active')
  const boostedListings = activeListings.filter(l => l.boosted)

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
      {/* ── Hero — typography-driven ────────────────────────── */}
      <div className="relative overflow-hidden bg-white">
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
      <section className="pt-6 pb-2 lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 mb-3.5 lg:px-0 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold text-sib-text tracking-tight lg:text-xl">Browse by Category</h2>
            <p className="text-[11px] text-sib-muted mt-0.5 font-medium lg:text-xs">Find exactly what you're looking for</p>
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

      {/* ── Sell CTA ──────────────────────────────────────────── */}
      <section className="px-4 mb-5 lg:max-w-lg lg:mx-auto">
        <button
          onClick={() => authNav('/sell')}
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
          <p className="text-xs text-sib-muted mb-3 leading-relaxed">Join Sib and start selling your pre-loved items to buyers across Malta.</p>
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
