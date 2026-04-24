import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getHistory, hasActivity } from '../lib/browsingHistory'
import ListingCard from './ListingCard'

/**
 * Personalised "Picked for you" section for the homepage.
 *
 * Scoring heuristic (simple, no AI):
 *  +4  category matches a recently browsed category
 *  +3  brand matches a recently browsed brand
 *  +3  gender matches a recently browsed gender
 *  +2  title/description contains a recent search term
 *  +1  more recent listings get a small recency boost
 *
 * This section only renders when there is enough signed-in
 * browsing activity to produce useful recommendations.
 */

const MAX_ITEMS = 8

export default function PickedForYou() {
  const { currentUser, listings } = useApp()
  const navigate = useNavigate()
  const personalised = Boolean(currentUser) && hasActivity()

  const picks = useMemo(() => {
    if (!personalised) return []
    const active = listings.filter(l => l.status === 'active')
    if (active.length === 0) return []
    const history = getHistory()

    // ── Score every active listing ───────────────────────────
    const { searches, viewedIds, categories, brands, genders } = history
    const catSet = new Set(categories)
    const brandSet = new Set(brands.map(b => b.toLowerCase()))
    const genderSet = new Set(genders)
    const viewedSet = new Set(viewedIds)

    const scored = active
      .filter(l => !viewedSet.has(l.id)) // exclude already-seen items
      .map(l => {
        let score = 0

        // Category match
        if (l.category && catSet.has(l.category.toLowerCase())) score += 4

        // Brand match
        if (l.brand && brandSet.has(l.brand.toLowerCase())) score += 3

        // Gender match
        if (l.gender && genderSet.has(l.gender.toLowerCase())) score += 3

        // Search-term match (check title + description)
        const text = `${l.title} ${l.description}`.toLowerCase()
        for (const q of searches) {
          if (text.includes(q)) { score += 2; break }
        }

        // Recency boost (small): listings from the last 7 days get +1
        const ageMs = Date.now() - new Date(l.createdAt).getTime()
        if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 1

        return { listing: l, score }
      })
      .sort((a, b) => b.score - a.score || (b.listing.views || 0) - (a.listing.views || 0))

    const positive = scored.filter(s => s.score > 0).map(s => s.listing)
    return positive.slice(0, MAX_ITEMS)
  }, [listings, personalised])

  if (picks.length === 0) return null

  return (
    <section className="mb-6 lg:max-w-6xl lg:mx-auto lg:px-8">
      <div className="flex items-center justify-between px-4 mb-1 lg:px-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} className="text-sib-primary" />
          <h2 className="text-base font-bold text-sib-text dark:text-[#f4efe7] lg:text-lg">Picked for You</h2>
        </div>
        <button
          onClick={() => navigate('/browse')}
          className="flex items-center gap-0.5 text-xs text-sib-primary font-medium lg:text-sm"
        >
          See all <ArrowRight size={13} />
        </button>
      </div>
      <p className="px-4 text-[11px] text-sib-muted dark:text-[#aeb8b4] mb-3 lg:px-0 lg:text-xs lg:mb-4">
        Based on your recent browsing
      </p>

      {/* Mobile: horizontal scroll. Desktop: grid */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
        {picks.map(listing => (
          <div key={listing.id} className="flex-shrink-0 w-36">
            <ListingCard listing={listing} size="small" />
          </div>
        ))}
      </div>
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
        {picks.slice(0, 8).map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  )
}
