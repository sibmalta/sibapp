import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Shared layout for all legal / policy pages.
 * Props:
 *  - icon: lucide icon component
 *  - title: page heading
 *  - subtitle: optional subtext below heading
 *  - lastUpdated: e.g. "January 2025"
 *  - children: page body
 */
export default function PolicyLayout({ icon: Icon, title, subtitle, lastUpdated, children }) {
  const navigate = useNavigate()

  return (
    <div className="px-4 py-5 pb-14 max-w-2xl mx-auto lg:px-8 lg:py-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sib-muted dark:text-[#aeb8b4] text-sm font-medium mb-5 hover:text-sib-text dark:hover:text-[#f4efe7] transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1.5">
          {Icon && <Icon size={22} className="text-sib-primary flex-shrink-0" />}
          <h1 className="text-xl font-bold text-sib-text dark:text-[#f4efe7] lg:text-2xl">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-sm text-sib-muted dark:text-[#aeb8b4] mt-1">{subtitle}</p>
        )}
        {lastUpdated && (
          <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-2">Last updated: {lastUpdated}</p>
        )}
      </div>

      <div className="space-y-7 text-sm text-sib-text dark:text-[#f4efe7] leading-relaxed">
        {children}
      </div>

      <div className="mt-10 p-4 rounded-2xl bg-sib-warm dark:bg-[#26322f] border border-sib-stone dark:border-[rgba(242,238,231,0.10)] transition-colors">
        <p className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed">
          Have questions? Check our{' '}
          <Link to="/faq" className="text-sib-primary font-semibold underline underline-offset-2">FAQ</Link>{' '}
          or{' '}
          <Link to="/contact" className="text-sib-primary font-semibold underline underline-offset-2">contact our support team</Link>.
        </p>
      </div>
    </div>
  )
}

export function PolicySection({ number, title, children }) {
  return (
    <section>
      <h2 className="font-bold text-base mb-2.5 text-sib-text dark:text-[#f4efe7] lg:text-lg">
        {number ? `${number}. ` : ''}{title}
      </h2>
      {children}
    </section>
  )
}

export function PolicyBullets({ items }) {
  return (
    <ul className="space-y-2 pl-1 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PolicyCallout({ icon: CIcon, variant = 'info', title, children }) {
  const styles = {
    info: 'bg-sib-warm dark:bg-[#26322f] border-sib-stone dark:border-[rgba(242,238,231,0.10)]',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-100',
  }
  const iconStyles = {
    info: 'text-sib-primary',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-500',
  }
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${styles[variant]}`}>
      {CIcon && <CIcon size={18} className={`${iconStyles[variant]} flex-shrink-0 mt-0.5`} />}
      <div>
        {title && <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7] mb-1">{title}</p>}
        <div className="text-xs text-sib-muted dark:text-[#aeb8b4] leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function PolicyCoveredItem({ icon: ItemIcon, iconClass, title, description }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-green-50">
      {ItemIcon && <ItemIcon size={16} className={`${iconClass || 'text-green-600'} flex-shrink-0 mt-0.5`} />}
      <div>
        <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">{title}</p>
        {description && <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

export function PolicyNotCoveredItem({ icon: ItemIcon, iconClass, title, description }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50">
      {ItemIcon && <ItemIcon size={16} className={`${iconClass || 'text-red-500'} flex-shrink-0 mt-0.5`} />}
      <div>
        <p className="text-sm font-semibold text-sib-text dark:text-[#f4efe7]">{title}</p>
        {description && <p className="text-xs text-sib-muted dark:text-[#aeb8b4] mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
