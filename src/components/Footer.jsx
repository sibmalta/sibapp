import React from 'react'
import { Link } from 'react-router-dom'

const FOOTER_SECTIONS = [
  {
    title: 'Sib',
    links: [
      { label: 'About', to: '/about' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Buyer Protection', to: '/buyer-protection' },
      { label: 'Seller Policy', to: '/seller-policy' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact us', to: '/contact' },
      { label: 'Help & FAQ', to: '/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms & Conditions', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Delivery Policy', to: '/delivery-policy' },
      { label: 'Disputes & Refunds', to: '/disputes-refunds' },
      { label: 'Cookie Policy', to: '/cookies' },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#F7F7F7] dark:bg-[#111716] border-t border-sib-stone/50 dark:border-[#2d3635] mt-8 transition-colors">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-6 lg:max-w-6xl lg:px-8">
        {/* Logo — prominent brand anchor */}
        <div className="mb-8">
          <img
            src={`${import.meta.env.BASE_URL}assets/sib-3.png`}
            alt="Sib"
            className="h-14 md:h-20 w-auto"
          />
          <p className="text-[13px] text-sib-muted mt-3 leading-relaxed max-w-xs">
            Malta's marketplace for second-hand fashion, electronics, and more.
          </p>
        </div>

        {/* Link sections — stacked on mobile, row on desktop */}
        <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-3 lg:flex lg:gap-16 mb-8">
          {FOOTER_SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-sib-text uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-sib-muted hover:text-sib-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-sib-stone/60 mb-4" />

        {/* Copyright */}
        <p className="text-[11px] text-sib-muted text-center">
          &copy; {year} Sib Malta. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
