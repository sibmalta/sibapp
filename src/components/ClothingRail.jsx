import React from 'react'

// SVG garment silhouettes – hanger + garment shape
const GARMENTS = [
  // Dress
  ({ color }) => (
    <svg width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* hanger hook */}
      <path d="M19 2 Q22 2 22 6 Q22 9 19 9 Q16 9 16 6 Q16 2 19 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="19" y1="9" x2="19" y2="13" stroke={color} strokeWidth="1.5"/>
      {/* hanger bar */}
      <path d="M4 13 Q19 10 34 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* dress body */}
      <path d="M9 13 L6 28 Q6 32 4 36 L4 54 Q4 55 5 55 L33 55 Q34 55 34 54 L34 36 Q32 32 32 28 L29 13" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
      {/* waist */}
      <path d="M7 27 Q19 24 31 27" stroke={color} strokeWidth="1" fill="none"/>
    </svg>
  ),
  // T-shirt
  ({ color }) => (
    <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 Q23 2 23 5.5 Q23 8 20 8 Q17 8 17 5.5 Q17 2 20 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="20" y1="8" x2="20" y2="11" stroke={color} strokeWidth="1.5"/>
      <path d="M5 11 Q20 8 35 11" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M9 11 L2 22 L10 24 L10 50 Q10 51 11 51 L29 51 Q30 51 30 50 L30 24 L38 22 L31 11 Q25 16 20 16 Q15 16 9 11Z" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
    </svg>
  ),
  // Blazer / Jacket
  ({ color }) => (
    <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2 Q25 2 25 5.5 Q25 9 22 9 Q19 9 19 5.5 Q19 2 22 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="22" y1="9" x2="22" y2="13" stroke={color} strokeWidth="1.5"/>
      <path d="M6 13 Q22 10 38 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* lapels */}
      <path d="M10 13 L4 24 L12 28 L12 56 Q12 57 13 57 L31 57 Q32 57 32 56 L32 28 L40 24 L34 13 Q28 20 22 20 Q16 20 10 13Z" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
      <path d="M22 20 L22 56" stroke={color} strokeWidth="1" strokeDasharray="2 2"/>
      {/* lapel detail */}
      <path d="M18 20 L14 27" stroke={color} strokeWidth="1.2"/>
      <path d="M26 20 L30 27" stroke={color} strokeWidth="1.2"/>
    </svg>
  ),
  // Trousers
  ({ color }) => (
    <svg width="36" height="58" viewBox="0 0 36 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2 Q21 2 21 5 Q21 8 18 8 Q15 8 15 5 Q15 2 18 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="18" y1="8" x2="18" y2="12" stroke={color} strokeWidth="1.5"/>
      <path d="M3 12 Q18 9 33 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* waistband */}
      <rect x="4" y="12" width="28" height="6" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.18"/>
      {/* legs */}
      <path d="M4 18 L4 56 Q4 57 5 57 L17 57 Q18 57 18 56 L18 28 L18 28 L18 56 Q18 57 19 57 L31 57 Q32 57 32 56 L32 18Z" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
      <line x1="18" y1="18" x2="18" y2="58" stroke={color} strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  ),
  // Skirt
  ({ color }) => (
    <svg width="40" height="54" viewBox="0 0 40 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 Q23 2 23 5 Q23 8 20 8 Q17 8 17 5 Q17 2 20 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="20" y1="8" x2="20" y2="12" stroke={color} strokeWidth="1.5"/>
      <path d="M5 12 Q20 9 35 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* waistband */}
      <rect x="7" y="12" width="26" height="5" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.18"/>
      {/* A-line skirt */}
      <path d="M7 17 L2 52 Q2 53 3 53 L37 53 Q38 53 38 52 L33 17Z" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
    </svg>
  ),
  // Hoodie
  ({ color }) => (
    <svg width="42" height="54" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 2 Q24 2 24 5.5 Q24 9 21 9 Q18 9 18 5.5 Q18 2 21 2Z" stroke={color} strokeWidth="1.5" fill="none"/>
      <line x1="21" y1="9" x2="21" y2="12" stroke={color} strokeWidth="1.5"/>
      <path d="M6 12 Q21 9 36 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* hood */}
      <path d="M11 12 Q8 12 7 17 Q6 22 11 24" stroke={color} strokeWidth="1.2" fill="none"/>
      <path d="M31 12 Q34 12 35 17 Q36 22 31 24" stroke={color} strokeWidth="1.2" fill="none"/>
      <path d="M11 12 Q21 8 31 12 Q26 22 21 22 Q16 22 11 12Z" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      {/* body */}
      <path d="M9 12 L2 22 L10 25 L10 52 Q10 53 11 53 L31 53 Q32 53 32 52 L32 25 L40 22 L33 12" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.12" strokeLinejoin="round"/>
      {/* zip */}
      <line x1="21" y1="22" x2="21" y2="52" stroke={color} strokeWidth="1" strokeDasharray="2 2"/>
    </svg>
  ),
]

// Colour palette for garments — warm, fashion-forward
const COLORS = [
  '#B5A520', // brand gold
  '#C44848', // brand red
  '#3D6B8C', // steel blue
  '#7A5C8C', // mauve
  '#4A7A5C', // sage
  '#C47A35', // terracotta
  '#5C5C5C', // charcoal
  '#8C6B4A', // camel
]

function GarmentItem({ index }) {
  const GarmentSvg = GARMENTS[index % GARMENTS.length]
  const color = COLORS[index % COLORS.length]
  return (
    <div className="flex flex-col items-center mx-5" style={{ opacity: 0.88 }}>
      <GarmentSvg color={color} />
    </div>
  )
}

export default function ClothingRail({ count = 10, reverse = false, speed }) {
  // Duplicate items so the seamless loop works (we translate -50%)
  const items = Array.from({ length: count }, (_, i) => i)
  const doubled = [...items, ...items]

  return (
    <div className="w-full overflow-hidden relative">
      {/* The rail rod */}
      <div className="absolute top-[11px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />

      <div
        className={reverse ? 'animate-rail-reverse' : 'animate-rail'}
        style={{
          display: 'flex',
          width: 'max-content',
          willChange: 'transform',
          ...(speed ? { animationDuration: `${speed}s` } : {}),
        }}
      >
        {doubled.map((i, idx) => (
          <GarmentItem key={idx} index={i} />
        ))}
      </div>
    </div>
  )
}
