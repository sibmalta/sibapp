import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Ban, AlertTriangle } from 'lucide-react'

const CATEGORIES = [
  {
    title: 'Illegal goods',
    description: 'Any item that is illegal to sell, buy, or possess under Maltese or EU law.',
    examples: ['Stolen property', 'Unlicensed goods', 'Items violating import/export laws'],
    color: 'red',
  },
  {
    title: 'Counterfeit items',
    description: 'Fake or replica items that imitate a brand without authorisation.',
    examples: ['Fake designer clothing or bags', 'Replica watches', 'Knockoff footwear with brand logos'],
    color: 'red',
  },
  {
    title: 'Dangerous goods',
    description: 'Items that pose a safety risk to the buyer, seller, or delivery personnel.',
    examples: ['Flammable materials', 'Toxic substances', 'Hazardous chemicals'],
    color: 'orange',
  },
  {
    title: 'Weapons',
    description: 'Any offensive weapon or item designed to cause harm.',
    examples: ['Knives and bladed weapons', 'Firearms and ammunition', 'Pepper spray or self-defence weapons'],
    color: 'red',
  },
  {
    title: 'Restricted items',
    description: 'Items that require special licensing or are otherwise restricted from general sale.',
    examples: ['Prescription medication', 'Alcohol and tobacco products', 'Adult content'],
    color: 'orange',
  },
]

export default function ProhibitedItemsPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-2">
        <Ban size={22} className="text-red-500 flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Prohibited Items</h1>
      </div>
      <p className="text-sm text-sib-muted mb-6">
        To keep Sib safe and trustworthy for everyone, the following items are not allowed on the platform.
      </p>

      <div className="space-y-4 mb-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="rounded-2xl border border-sib-stone overflow-hidden">
            <div className={`px-4 py-3 ${cat.color === 'red' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <h2 className="font-bold text-sm text-sib-text">{cat.title}</h2>
              <p className="text-xs text-sib-muted mt-0.5">{cat.description}</p>
            </div>
            <div className="px-4 py-3 bg-white">
              <p className="text-[11px] font-semibold text-sib-muted uppercase tracking-wide mb-1.5">Examples</p>
              <ul className="space-y-1">
                {cat.examples.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-sib-text">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${cat.color === 'red' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
        <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-sib-text">What happens if you list a prohibited item?</p>
          <p className="text-xs text-sib-muted mt-1 leading-relaxed">
            Listings that violate this policy will be removed without notice. Repeat offenders 
            may have their accounts suspended or permanently banned. If you are unsure whether 
            an item is allowed, contact our support team before listing.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <p className="text-xs text-sib-muted leading-relaxed">
          This list is not exhaustive. Sib reserves the right to remove any listing that 
          we believe is inappropriate, unsafe, or violates the spirit of our community. 
          See our <Link to="/terms" className="text-sib-primary font-semibold underline underline-offset-2">Terms & Conditions</Link> for full details.
        </p>
      </div>
    </div>
  )
}
