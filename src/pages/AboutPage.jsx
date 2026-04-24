import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, ShieldCheck, Truck, Users, Leaf, MapPin } from 'lucide-react'

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="pb-10 bg-white dark:bg-[#18211f] min-h-screen transition-colors">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-sib-muted font-medium mb-3 hover:text-sib-text transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-sib-text tracking-tight">About Sib</h1>
        <p className="text-sm text-sib-muted mt-1 leading-relaxed">
          Malta's trusted marketplace for second-hand goods.
        </p>
      </div>

      {/* Mission */}
      <section className="px-4 mb-8">
        <div className="p-4 rounded-2xl bg-sib-primary/5 border border-sib-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-sib-secondary" />
            <h2 className="text-base font-bold text-sib-text">Our Mission</h2>
          </div>
          <p className="text-sm text-sib-muted leading-relaxed">
            Sib was built to make buying and selling second-hand in Malta easy, safe, and enjoyable.
            We believe great things deserve a second life — and that every item passed on is one less
            item in landfill.
          </p>
        </div>
      </section>

      {/* What is Sib */}
      <section className="px-4 mb-8">
        <h2 className="text-lg font-bold text-sib-text mb-3">What is Sib?</h2>
        <p className="text-sm text-sib-muted leading-relaxed mb-3">
          Sib is a mobile-first marketplace designed for people in Malta who want to buy and sell
          pre-loved fashion, electronics, books, home goods, and more. Whether you are clearing out
          your wardrobe or looking for a bargain, Sib connects you with buyers and sellers across
          the Maltese islands.
        </p>
        <p className="text-sm text-sib-muted leading-relaxed">
          Every transaction on Sib is backed by secure payments, tracked delivery, and buyer
          protection — so you can trade with confidence.
        </p>
      </section>

      <div className="h-px bg-sib-stone mx-4 mb-8" />

      {/* Why Sib */}
      <section className="px-4 mb-8">
        <h2 className="text-lg font-bold text-sib-text mb-4">Why Sib?</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              icon: ShieldCheck,
              title: 'Safe & Secure',
              desc: 'Payments are held in escrow until you confirm delivery. Your money is protected at every step.',
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              icon: Truck,
              title: 'Tracked Delivery',
              desc: 'Every order ships with tracked delivery across Malta. No more guessing when your parcel will arrive.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: MapPin,
              title: 'Made for Malta',
              desc: 'Sib is built specifically for the Maltese market — local sellers, local delivery, and prices in Euro.',
              color: 'bg-amber-50 text-amber-600',
            },
            {
              icon: Leaf,
              title: 'Sustainable Shopping',
              desc: 'Every second-hand purchase reduces waste and extends the life of quality goods. Good for you, good for the planet.',
              color: 'bg-green-50 text-green-600',
            },
            {
              icon: Users,
              title: 'Community-Driven',
              desc: 'Sib is powered by its community. Sellers are rated and reviewed, building trust through every transaction.',
              color: 'bg-violet-50 text-violet-600',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-3.5 rounded-xl border border-sib-stone/50 dark:border-[rgba(242,238,231,0.10)] bg-white dark:bg-[#202b28] flex gap-3 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-sib-text mb-0.5">{title}</p>
                <p className="text-xs text-sib-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-sib-stone mx-4 mb-8" />

      {/* How it started */}
      <section className="px-4 mb-8">
        <h2 className="text-lg font-bold text-sib-text mb-3">How It Started</h2>
        <p className="text-sm text-sib-muted leading-relaxed mb-3">
          Sib started from a simple observation: people in Malta love buying and selling second-hand,
          but existing options lacked trust, secure payments, and reliable delivery. We set out to
          change that.
        </p>
        <p className="text-sm text-sib-muted leading-relaxed">
          The name "Sib" comes from the Maltese word meaning "find" — because we want everyone
          to find something they love, at a price they can feel good about.
        </p>
      </section>

      {/* CTAs */}
      <div className="px-4 space-y-2.5">
        <button
          onClick={() => navigate('/browse')}
          className="w-full py-3.5 rounded-2xl bg-sib-secondary text-white text-sm font-bold active:scale-[0.98] transition-transform hover:bg-sib-secondary/90"
        >
          Start Browsing
        </button>
        <Link
          to="/how-it-works"
          className="w-full py-3 rounded-2xl border border-sib-stone dark:border-[rgba(242,238,231,0.10)] text-sib-text dark:text-[#f4efe7] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-sib-sand dark:hover:bg-[#26322f] transition-colors"
        >
          See How It Works
        </Link>
      </div>
    </div>
  )
}
