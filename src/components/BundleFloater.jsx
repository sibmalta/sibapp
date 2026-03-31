import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function BundleFloater() {
  const navigate = useNavigate()
  const { bundle, getListingById, getUserById } = useApp()

  if (!bundle || bundle.items.length === 0) return null

  const items = bundle.items.map(id => getListingById(id)).filter(Boolean)
  const subtotal = items.reduce((sum, l) => sum + l.price, 0)
  const seller = getUserById(bundle.sellerId)

  return (
    <button
      onClick={() => navigate('/bundle')}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-md w-[calc(100%-2rem)] lg:bottom-6 lg:max-w-sm"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-sib-primary text-white rounded-2xl shadow-lg shadow-sib-primary/30 active:scale-[0.98] transition-transform">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 relative">
          <Package size={18} />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-sib-primary text-[10px] font-bold px-1">
            {items.length}
          </span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold">View Bundle</p>
          <p className="text-[11px] text-white/80">{items.length} item{items.length !== 1 ? 's' : ''} from @{seller?.username} · €{subtotal.toFixed(2)}</p>
        </div>
        <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-lg flex-shrink-0">
          €{subtotal.toFixed(2)}
        </span>
      </div>
    </button>
  )
}
