import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ title, right, onBack }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sib-stone/60">
      <div className="flex items-center h-12 px-3 lg:max-w-6xl lg:mx-auto lg:px-8">
        {/* Left: back button */}
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 -ml-1 active:bg-sib-sand transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-sib-text" />
        </button>

        {/* Center: title */}
        <div className="flex-1 text-center">
          {title && (
            <h1 className="text-[15px] font-bold text-sib-text truncate px-2">{title}</h1>
          )}
        </div>

        {/* Right: optional actions or spacer to balance the back button */}
        <div className="flex-shrink-0 flex items-center justify-end" style={{ minWidth: 36 }}>
          {right || <div className="w-9" />}
        </div>
      </div>
    </header>
  )
}
