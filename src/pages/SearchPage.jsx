import React, { useState, useMemo } from 'react'
import { ArrowLeft, Search, X, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { CATEGORIES, CONDITIONS, LOCATIONS } from '../lib/constants'
import ListingCard from '../components/ListingCard'

export default function SearchPage() {
  const { listings, searchQuery, setSearchQuery } = useApp()
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: 'all',
    condition: 'all',
    location: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
  })

  const results = useMemo(() => {
    let items = [...listings]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      )
    }

    if (filters.category !== 'all') items = items.filter(l => l.category === filters.category)
    if (filters.condition !== 'all') items = items.filter(l => l.condition === filters.condition)
    if (filters.location !== 'all') items = items.filter(l => l.location === filters.location)
    if (filters.minPrice) items = items.filter(l => l.price >= Number(filters.minPrice))
    if (filters.maxPrice) items = items.filter(l => l.price <= Number(filters.maxPrice))

    if (filters.sortBy === 'newest') items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (filters.sortBy === 'price_low') items.sort((a, b) => a.price - b.price)
    else if (filters.sortBy === 'price_high') items.sort((a, b) => b.price - a.price)
    else if (filters.sortBy === 'popular') items.sort((a, b) => b.views - a.views)

    return items
  }, [listings, searchQuery, filters])

  const resetFilters = () => setFilters({ category: 'all', condition: 'all', location: 'all', minPrice: '', maxPrice: '', sortBy: 'newest' })

  return (
    <div>
      {/* Search header */}
      <div className="sticky top-0 z-40 bg-sib-warm px-4 pt-4 pb-2 md:max-w-6xl md:mx-auto md:pt-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="md:hidden p-1">
            <ArrowLeft className="w-5 h-5 text-sib-text" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sib-muted" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl text-sm outline-none border border-sib-stone focus:border-sib-primary/40 text-sib-text placeholder-sib-muted"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-sib-muted" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-sib-primary border-sib-primary text-white' : 'bg-white border-sib-stone text-sib-text'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="px-4 py-4 bg-white border-b border-sib-stone md:max-w-6xl md:mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Category</label>
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm bg-white text-sib-text"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Condition</label>
              <select
                value={filters.condition}
                onChange={e => setFilters(f => ({ ...f, condition: e.target.value }))}
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm bg-white text-sib-text"
              >
                <option value="all">All</option>
                {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Location</label>
              <select
                value={filters.location}
                onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm bg-white text-sib-text"
              >
                <option value="all">All Malta</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Sort by</label>
              <select
                value={filters.sortBy}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm bg-white text-sib-text"
              >
                <option value="newest">Newest first</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="popular">Most viewed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Min price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm text-sib-text"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-sib-muted mb-1 block">Max price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                placeholder="999"
                className="w-full px-3 py-2 border border-sib-stone rounded-xl text-sm text-sib-text"
              />
            </div>
          </div>
          <button onClick={resetFilters} className="mt-3 text-xs text-sib-primary font-semibold">
            Reset filters
          </button>
        </div>
      )}

      {/* Results */}
      <div className="px-4 mt-4 md:max-w-6xl md:mx-auto">
        <p className="text-xs text-sib-muted mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
        {results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sib-muted text-sm">No items match your search</p>
            <p className="text-sib-muted text-xs mt-1">Try different keywords or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {results.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
