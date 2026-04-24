import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Search,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import ListingCard from '../components/ListingCard'
import useScrollRestore from '../hooks/useScrollRestore'
import PickedForYou from '../components/PickedForYou'
import useAuthNav from '../hooks/useAuthNav'
import CategoryBento from '../components/CategoryBento'
import SearchAutocomplete from '../components/SearchAutocomplete'
import { CATEGORY_TREE, resolveCategory } from '../data/categories'

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

function isRenderableListing(listing) {
  return !!listing?.id && listing.price !== undefined && listing.price !== null && !Number.isNaN(Number(listing.price))
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
  const { currentUser, listings, listingsLoading } = useApp()
  const navigate = useNavigate()
  const authNav = useAuthNav()
  const [mobileSearch, setMobileSearch] = useState('')

  useEffect(() => {
    document.title = 'Sib — Marketplace'
  }, [])

  useScrollRestore('/')

  const activeListings = listings.filter(l => l.status === 'active' && isRenderableListing(l))

  const freshListings = useMemo(() => {
    return [...activeListings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
  }, [activeListings])

  const handleMobileSearch = (e) => {
    e.preventDefault()
    const query = mobileSearch.trim()
    if (query.length >= 2) return
    navigate(query ? `/browse?q=${encodeURIComponent(query)}` : '/browse')
  }

  const handleMobileSuggestionSelect = useCallback((suggestion) => {
    if (suggestion.type === 'auth_prompt') {
      navigate('/auth', { state: { from: '/' } })
    } else if (suggestion.type === 'user' && suggestion.username) {
      navigate(`/profile/${suggestion.username}`)
    } else if (suggestion.type === 'item' && suggestion.id) {
      navigate(`/listing/${suggestion.id}`)
    } else {
      const params = new URLSearchParams()
      if (suggestion.query) params.set('q', suggestion.query)
      if (suggestion.category) params.set('cat', suggestion.category)
      if (suggestion.subcategory) params.set('sub', suggestion.subcategory)
      if (suggestion.brand) params.set('brand', suggestion.brand)
      if (!suggestion.query && !suggestion.category && !suggestion.brand) {
        params.set('q', suggestion.label)
      }
      navigate(`/browse?${params.toString()}`)
    }
  }, [navigate])

  // ── Live counts per top-level category (supports legacy mapping) ────
  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const l of activeListings) {
      const resolved = resolveCategory(l.category)
      if (resolved) counts[resolved] = (counts[resolved] || 0) + 1
    }
    return counts
  }, [activeListings])

  // ── Category click handler ────────────────────────────────
  const handleCategoryClick = (categoryId) => {
    navigate(`/browse?cat=${categoryId}`)
  }

  return (
    <div className="pb-4 lg:max-w-7xl lg:mx-auto bg-[#FAFAF9] dark:bg-[#18211f] transition-colors">
      <section className="lg:hidden bg-white dark:bg-[#202b28] px-4 pt-3 pb-4 border-b border-sib-stone/50 dark:border-[rgba(242,238,231,0.10)] transition-colors">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sib-muted dark:text-[#aeb8b4] font-bold">Sib marketplace</p>
            <h1 className="text-[22px] font-extrabold text-sib-text dark:text-[#f4efe7] leading-tight tracking-tight">Find your next pre-loved thing</h1>
          </div>
          <button
            onClick={() => authNav('/sell')}
            className="flex-shrink-0 rounded-full bg-sib-primary px-4 py-2 text-xs font-bold text-white active:scale-95 transition-transform"
          >
            Sell
          </button>
        </div>

        <form onSubmit={handleMobileSearch} className="relative z-30 overflow-visible">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sib-muted pointer-events-none" />
          <input
            value={mobileSearch}
            onChange={e => setMobileSearch(e.target.value)}
            placeholder="Search brands, styles, items..."
            className="w-full rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] bg-sib-sand/70 dark:bg-[#26322f] py-3 pl-10 pr-4 text-sm font-medium text-sib-text dark:text-[#f4efe7] placeholder-sib-muted dark:placeholder:text-[#aeb8b4] outline-none focus:border-sib-primary focus:bg-white dark:focus:bg-[#30403c] transition-colors"
          />
          <SearchAutocomplete
            query={mobileSearch}
            onSelect={handleMobileSuggestionSelect}
          />
        </form>
      </section>

      {listingsLoading ? (
        <section className="lg:hidden pt-4">
          <ListingRowSkeleton />
        </section>
      ) : freshListings.length > 0 && (
        <section className="lg:hidden pt-4 pb-1 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-extrabold text-sib-text dark:text-[#f4efe7] tracking-tight">Fresh Finds</h2>
            <button onClick={() => navigate('/browse?sort=newest')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {freshListings.slice(0, 6).map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
      {/* ── Hero — typography-driven ────────────────────────── */}
      <div className="relative hidden overflow-hidden bg-white dark:bg-[#202b28] lg:block transition-colors">
        {/* Subtle ambient glow accents */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #C68A2E 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #C68A2E 0%, transparent 70%)' }} />

        <div className="relative px-5 pt-14 pb-12 lg:max-w-5xl lg:mx-auto lg:px-12 lg:pt-20 lg:pb-16">
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.3em] text-sib-muted dark:text-[#aeb8b4] font-semibold mb-4 lg:text-[12px] lg:mb-5">
            Sib — Malta's marketplace
          </p>

          {/* Headline */}
          <h1 className="text-[38px] font-extrabold leading-[1.04] tracking-tight text-sib-text dark:text-[#f4efe7] mb-5 max-w-[340px] sm:text-[46px] sm:max-w-[420px] md:text-[56px] md:max-w-[520px] lg:text-[72px] lg:max-w-[700px] xl:text-[82px] xl:max-w-[800px] lg:mb-7">
            Discover pre&#8209;loved finds you’ll love
          </h1>

          {/* Subtext */}
          <p className="text-[14px] text-sib-muted dark:text-[#aeb8b4] leading-[1.6] font-medium mb-8 max-w-[380px] sm:text-[15px] lg:text-[18px] lg:max-w-[500px] lg:mb-10">
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
              className="border border-sib-text/12 dark:border-[rgba(242,238,231,0.18)] text-sib-text dark:text-[#f4efe7] font-semibold text-[15px] py-4 px-7 rounded-2xl active:scale-95 transition-transform bg-white dark:bg-[#26322f] sm:text-base sm:px-9 sm:py-[18px] lg:text-[17px] lg:px-10 lg:py-5 hover:bg-gray-50 dark:hover:bg-[#30403c]"
            >
              Browse
            </button>
          </div>
        </div>
      </div>

      {listingsLoading ? (
        <section className="hidden lg:block pt-6 lg:max-w-6xl lg:mx-auto lg:px-8">
          <ListingRowSkeleton />
        </section>
      ) : freshListings.length > 0 && (
        <section className="hidden lg:block pt-6 pb-2 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[17px] font-extrabold text-sib-text dark:text-[#f4efe7] tracking-tight lg:text-xl">Fresh Finds</h2>
            <button onClick={() => navigate('/browse?sort=newest')} className="flex items-center gap-0.5 text-xs text-sib-primary font-semibold lg:text-sm">
              See all <ArrowRight size={13} />
            </button>
          </div>
          <p className="text-[11px] text-sib-muted dark:text-[#aeb8b4] mb-3 font-medium lg:text-xs">Latest listings across Malta</p>
          <div className="grid lg:grid-cols-4 lg:gap-4">
            {freshListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── Browse by Category — bento / masonry layout ────────── */}
      <section className="pt-4 pb-2 lg:pt-6 lg:max-w-6xl lg:mx-auto lg:px-8">
        <div className="px-4 mb-2.5 lg:mb-3.5 lg:px-0 flex items-end justify-between">
          <div>
            <h2 className="text-[17px] font-extrabold text-sib-text dark:text-[#f4efe7] tracking-tight lg:text-xl">Browse by Category</h2>
            <p className="hidden text-[11px] text-sib-muted dark:text-[#aeb8b4] mt-0.5 font-medium lg:block lg:text-xs">Find exactly what you're looking for</p>
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

      {currentUser && <PickedForYou />}


    </div>
  )
}
