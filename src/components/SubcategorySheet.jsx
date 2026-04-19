import React, { useEffect } from 'react'
import { X, Check } from 'lucide-react'

/**
 * Bottom-sheet that displays ALL subcategories for a given category.
 * Triggered by the "+ More" chip in the browse header.
 */
export default function SubcategorySheet({
  open,
  onClose,
  subcategories,
  selected,
  onSelect,
  categoryLabel,
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl animate-sheet-up max-h-[70vh] flex flex-col safe-area-bottom">
        {/* Handle + header */}
        <div className="pt-2 pb-3 px-5">
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-sib-text">
              {categoryLabel || 'Subcategories'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {subcategories.map(sub => {
            const isActive = selected === sub.id
            return (
              <button
                key={sub.id}
                onClick={() => { onSelect(sub.id); onClose() }}
                className={`w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-0 transition-colors ${
                  isActive ? 'text-sib-primary font-semibold' : 'text-sib-text'
                }`}
              >
                <span className="text-[14px]">{sub.label}</span>
                {isActive && <Check size={16} className="text-sib-primary" />}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
