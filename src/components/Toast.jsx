import React from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast } = useApp()
  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-none">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${
        isSuccess ? 'bg-sib-text text-white' : 'bg-red-600 text-white'
      }`}>
        {isSuccess
          ? <CheckCircle size={18} className="flex-shrink-0" />
          : <AlertCircle size={18} className="flex-shrink-0" />
        }
        <span className="text-sm font-medium flex-1">{toast.message}</span>
      </div>
    </div>
  )
}
