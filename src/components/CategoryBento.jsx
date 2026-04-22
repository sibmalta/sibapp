import React, { useRef, useState, useEffect } from 'react'

/*
 * Category browse layout.
 *
 * MOBILE  — Featured hero tile (Fashion) + horizontal snap carousel for the rest.
 * DESKTOP — Editorial magazine bento grid (unchanged).
 */

/* ── Tile component ─────────────────────────────────── */

function BentoTile({ cat, image, focalPoint, count, loading, variant = 'standard', onClick }) {
  // variant: 'hero' | 'wide' | 'medium' | 'standard' | 'carousel'

  const labelClasses = {
    hero:     'text-[20px] sm:text-[22px] lg:text-[26px]',
    carousel: 'text-[15px]',
    wide:     'text-[15px] sm:text-[16px] lg:text-[20px]',
    medium:   'text-[14px] sm:text-[15px] lg:text-[18px]',
    standard: 'text-[13px] sm:text-[14px] lg:text-[16px]',
  }

  const countClasses = {
    hero:     'text-[12px] lg:text-[13px]',
    carousel: 'text-[11px]',
    wide:     'text-[11px] lg:text-[12px]',
    medium:   'text-[11px] lg:text-[12px]',
    standard: 'text-[10px] lg:text-[11px]',
  }

  const padClasses = {
    hero:     'p-5 lg:p-7',
    carousel: 'p-3.5',
    wide:     'p-4 lg:p-5',
    medium:   'p-3.5 lg:p-5',
    standard: 'p-3 lg:p-4',
  }

  return (
    <button
      onClick={() => onClick(cat.id)}
      className="relative overflow-hidden rounded-2xl w-full h-full group active:scale-[0.97] transition-transform duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sib-primary/50"
    >
      <img
        src={image}
        alt={cat.label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-active:scale-105"
        style={focalPoint ? { objectPosition: focalPoint } : undefined}
      />
      {/* Gradient — stronger for hero tile */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          variant === 'hero'
            ? 'bg-gradient-to-t from-black/65 via-black/25 to-transparent group-hover:from-black/70'
            : 'bg-gradient-to-t from-black/55 via-black/15 to-transparent group-hover:from-black/60'
        }`}
      />
      {/* Label */}
      <div className={`absolute bottom-0 left-0 right-0 ${padClasses[variant]}`}>
        <span className={`${labelClasses[variant]} font-bold text-white leading-tight drop-shadow-md block`}>
          {cat.label}
        </span>
        {!loading && count > 0 && (
          <span className={`${countClasses[variant]} font-medium text-white/70 mt-0.5 block`}>
            {count} item{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}

/* ── Scroll indicator dots ───────────────────────────── */

function ScrollDots({ total, active }) {
  return (
    <div className="flex justify-center gap-1.5 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? 'w-5 h-1.5 bg-sib-primary'
              : 'w-1.5 h-1.5 bg-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default function CategoryBento({ categories, images, focalPoints = {}, counts, loading, onCategoryClick }) {
  const catMap = {}
  for (const c of categories) catMap[c.id] = c

  const tile = (id, variant) => {
    const cat = catMap[id]
    if (!cat) return null
    return (
      <BentoTile
        cat={cat}
        image={images[id]}
        focalPoint={focalPoints[id]}
        count={counts[id] || 0}
        loading={loading}
        variant={variant}
        onClick={onCategoryClick}
      />
    )
  }

  /* ── Mobile carousel state ─────────────────────────── */
  const scrollRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // Categories for the carousel (everything except the featured 'fashion')
  const FEATURED_ID = 'fashion'
  const carouselCats = categories.filter(c => c.id !== FEATURED_ID)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const scrollLeft = el.scrollLeft
      const tileWidth = el.firstChild?.offsetWidth || 1
      const gap = 12 // gap-3 = 12px
      const idx = Math.round(scrollLeft / (tileWidth + gap))
      setActiveIdx(Math.min(idx, carouselCats.length - 1))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [carouselCats.length])

  return (
    <>
      {/* ── MOBILE (< lg) — hero + horizontal carousel ───────── */}
      <div className="flex flex-col lg:hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {categories.map(cat => (
            <div
              key={cat.id}
              className="flex-shrink-0 h-[92px] sm:h-[108px]"
              style={{
                width: 'calc((100vw - 48px) / 3)',
                minWidth: '104px',
                maxWidth: '140px',
                scrollSnapAlign: 'start',
              }}
            >
              <BentoTile
                cat={cat}
                image={images[cat.id]}
                focalPoint={focalPoints[cat.id]}
                count={counts[cat.id] || 0}
                loading={loading}
                variant="carousel"
                onClick={onCategoryClick}
              />
            </div>
          ))}
          {/* Trailing spacer so last tile can snap-start with right padding */}
          <div className="flex-shrink-0 w-1" aria-hidden="true" />
        </div>
      </div>

      {/* ── DESKTOP (lg+) — editorial magazine layout ────────── */}
      <div className="hidden lg:flex lg:flex-col lg:gap-3">

        {/* Block 1: Fashion hero (left, tall) + Electronics wide / Books+Sports small */}
        <div className="grid grid-cols-5 gap-3" style={{ height: '380px' }}>
          <div className="col-span-2 h-full">
            {tile('fashion', 'hero')}
          </div>
          <div className="col-span-3 flex flex-col gap-3 h-full">
            <div className="flex-[1.15] min-h-0">
              {tile('electronics', 'wide')}
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
              <div>{tile('books', 'standard')}</div>
              <div>{tile('sports', 'standard')}</div>
            </div>
          </div>
        </div>

        {/* Block 2: Home & Living + Furniture */}
        <div className="grid grid-cols-2 gap-3" style={{ height: '200px' }}>
          <div>{tile('home', 'medium')}</div>
          <div>{tile('furniture', 'medium')}</div>
        </div>

        {/* Block 3: Toys + Kids */}
        <div className="grid grid-cols-2 gap-3" style={{ height: '170px' }}>
          <div>{tile('toys', 'standard')}</div>
          <div>{tile('kids', 'standard')}</div>
        </div>
      </div>
    </>
  )
}
