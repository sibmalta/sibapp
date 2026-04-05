import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, ShoppingBag, Tag, Truck, CreditCard, ShieldCheck, AlertTriangle, MessageCircle } from 'lucide-react'

const FAQ_SECTIONS = [
  {
    title: 'Buying',
    icon: ShoppingBag,
    items: [
      {
        q: 'How do I buy an item on Sib?',
        a: 'Browse listings, tap on one you like, then hit "Buy Now". You\'ll be guided through delivery details and payment. Once the seller ships and you confirm receipt, the transaction is complete.',
      },
      {
        q: 'What does Buyer Protection include?',
        a: 'Buyer Protection covers you if your item doesn\'t arrive, arrives damaged, or is significantly different from the listing description. You can open a dispute within 2 days of delivery and we\'ll review the case.',
      },
      {
        q: 'Can I message a seller before buying?',
        a: 'Yes. Every listing has a "Message Seller" button. You can ask questions about size, condition, or anything else before committing to a purchase.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'We accept card payments (Visa, Mastercard) processed securely through the Sib platform. All payments go through our system to ensure Buyer Protection applies.',
      },
    ],
  },
  {
    title: 'Selling',
    icon: Tag,
    items: [
      {
        q: 'How do I list an item?',
        a: 'Tap the "+" button, upload photos, add a title, description, price, category, and condition. Your listing goes live instantly once submitted.',
      },
      {
        q: 'Do sellers pay any fees?',
        a: 'There is no fee to list an item. Sib takes a small commission on each sale which is deducted from the payout amount. The exact percentage is shown when you list your item.',
      },
      {
        q: 'When do I get paid?',
        a: 'Your payout is released once the buyer confirms they received the item, or automatically after the confirmation window expires (typically 2 days after delivery).',
      },
      {
        q: 'How do payouts work?',
        a: 'Set up your payout method in Seller Dashboard > Payout Settings. Once a sale is confirmed, your earnings are sent to your chosen payout method.',
      },
    ],
  },
  {
    title: 'Delivery',
    icon: Truck,
    items: [
      {
        q: 'How does delivery work?',
        a: 'After a sale, the seller packages the item and hands it to Sib\'s delivery partner, or arranges a pickup. The buyer receives tracking information and can follow the delivery status in the app.',
      },
      {
        q: 'How long does delivery take?',
        a: 'Delivery within Malta typically takes 1–3 working days. Gozo deliveries may take an extra day. You\'ll see estimated delivery times at checkout.',
      },
      {
        q: 'Do all orders go through Sib delivery?',
        a: 'Yes. All orders must go through the Sib delivery system. This is how we ensure Buyer Protection is active and that both buyer and seller are covered.',
      },
    ],
  },
  {
    title: 'Payments & Payouts',
    icon: CreditCard,
    items: [
      {
        q: 'Why is there a Buyer Protection fee?',
        a: 'The Buyer Protection fee is a small charge added at checkout that funds our protection programme — covering refunds for lost, damaged, or misrepresented items. It keeps the platform safe for everyone.',
      },
      {
        q: 'How do I set up payouts?',
        a: 'Go to your Seller Dashboard and tap "Payout Settings". Enter your bank or payment details. You only need to do this once.',
      },
      {
        q: 'When are payouts sent?',
        a: 'Payouts are processed after the buyer confirms receipt of the item or after the automatic confirmation window closes (2 days after delivery). Processing may take 1–2 additional working days.',
      },
    ],
  },
  {
    title: 'Buyer Protection',
    icon: ShieldCheck,
    items: [
      {
        q: 'What am I protected against?',
        a: 'You\'re protected if the item doesn\'t arrive, arrives damaged during transit, or is significantly not as described in the listing (wrong item, major undisclosed defects, counterfeit goods).',
      },
      {
        q: 'What is not covered?',
        a: 'Minor wear consistent with the listed condition, slight colour differences due to screen settings, and items that match the listing description but simply don\'t fit are not covered. Buyer\'s remorse is also not grounds for a dispute.',
      },
      {
        q: 'Why must I pay through Sib?',
        a: 'Paying through Sib activates Buyer Protection. If you pay outside the platform (cash, direct bank transfer), we cannot protect you or mediate any disputes. Always use the in-app checkout.',
      },
    ],
  },
  {
    title: 'Disputes',
    icon: AlertTriangle,
    items: [
      {
        q: 'What happens if my item doesn\'t arrive?',
        a: 'If your item doesn\'t arrive within the estimated delivery window, open a dispute from your order page. We\'ll investigate with our delivery partner and issue a full refund if the item is confirmed lost.',
      },
      {
        q: 'What if the item is not as described?',
        a: 'Open a dispute from your order page within 2 days of delivery. Upload photos showing the issue. We\'ll review the listing, your evidence, and the seller\'s response before making a decision.',
      },
      {
        q: 'How long do I have to report an issue?',
        a: 'You have 2 days after confirmed delivery to open a dispute. After this window closes, the seller\'s payout is released and the transaction is considered final.',
      },
    ],
  },
]

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-sib-stone last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left active:bg-sib-sand transition-colors"
      >
        <span className="flex-1 text-sm font-semibold text-sib-text leading-snug">{question}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-sib-muted flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown size={16} className="text-sib-muted flex-shrink-0 mt-0.5" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-sm text-sib-muted leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const navigate = useNavigate()
  const [openItems, setOpenItems] = useState({})

  const toggleItem = (sectionIdx, itemIdx) => {
    const key = `${sectionIdx}-${itemIdx}`
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-2">
        <HelpCircle size={22} className="text-sib-primary flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Frequently Asked Questions</h1>
      </div>
      <p className="text-sm text-sib-muted mb-6">
        Everything you need to know about buying and selling on Sib.
      </p>

      <div className="space-y-5">
        {FAQ_SECTIONS.map((section, sIdx) => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-2">
              <section.icon size={15} className="text-sib-secondary flex-shrink-0" />
              <p className="text-[11px] font-semibold text-sib-muted uppercase tracking-wide">{section.title}</p>
            </div>
            <div className="rounded-2xl border border-sib-stone overflow-hidden bg-white">
              {section.items.map((item, iIdx) => (
                <AccordionItem
                  key={iIdx}
                  question={item.q}
                  answer={item.a}
                  isOpen={!!openItems[`${sIdx}-${iIdx}`]}
                  onToggle={() => toggleItem(sIdx, iIdx)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Still need help? */}
      <div className="mt-8 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle size={16} className="text-sib-primary" />
          <p className="text-sm font-bold text-sib-text">Still have questions?</p>
        </div>
        <p className="text-xs text-sib-muted leading-relaxed mb-3">
          Can't find what you're looking for? Our support team is ready to help.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sib-primary"
        >
          Contact Support →
        </Link>
      </div>
    </div>
  )
}
