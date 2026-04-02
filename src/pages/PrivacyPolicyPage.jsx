import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()
  return (
    <div className="px-4 py-5 pb-10 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sib-muted text-sm font-medium mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-2.5 mb-6">
        <Lock size={22} className="text-sib-primary flex-shrink-0" />
        <h1 className="text-xl font-bold text-sib-text">Privacy Policy</h1>
      </div>

      <p className="text-xs text-sib-muted mb-6">Last updated: January 2025</p>

      <div className="space-y-6 text-sm text-sib-text leading-relaxed">
        <section>
          <h2 className="font-bold text-base mb-2">1. Information we collect</h2>
          <p>
            When you create an account on Sib, we collect your name, email address, username, 
            and location. When you list items or make purchases, we also collect transaction-related 
            information such as shipping addresses, payment details (processed securely via third-party 
            providers), and order history.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">2. How we use your data</h2>
          <p className="mb-2">We use the information we collect to:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              'Provide, maintain, and improve the Sib marketplace',
              'Process transactions and send related notifications',
              'Facilitate communication between buyers and sellers',
              'Prevent fraud and enforce our terms of service',
              'Send you updates about your account, orders, and the platform',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">3. Data sharing</h2>
          <p>
            We do not sell your personal data. We share limited information only when necessary: 
            with payment providers to process transactions, with delivery services to ship items, 
            and with law enforcement if legally required. Buyers and sellers may see each other's 
            username, location, and rating as part of normal marketplace operations.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">4. Data storage & security</h2>
          <p>
            Your data is stored securely using industry-standard encryption and hosted on 
            trusted infrastructure providers. We implement appropriate technical and organisational 
            measures to protect your personal information against unauthorised access, loss, or misuse.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">5. Your rights</h2>
          <p className="mb-2">Under applicable data protection laws, you have the right to:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              'Access and receive a copy of your personal data',
              'Correct inaccurate or incomplete data',
              'Request deletion of your account and associated data',
              'Object to or restrict certain processing of your data',
              'Withdraw consent at any time (where processing is based on consent)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sib-primary flex-shrink-0 mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">6. Cookies & analytics</h2>
          <p>
            Sib uses essential cookies to keep you logged in and maintain your session. We may 
            also use anonymised analytics to understand how the platform is used and to improve 
            the user experience. We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">7. Children's privacy</h2>
          <p>
            Sib is not intended for use by anyone under the age of 18. We do not knowingly 
            collect personal data from minors. If we discover that a user is under 18, we will 
            take steps to delete their account and associated data.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-base mb-2">8. Changes to this policy</h2>
          <p>
            We may update this privacy policy from time to time. If we make significant changes, 
            we will notify users through the app. Continued use of Sib after changes means you 
            accept the updated policy.
          </p>
        </section>
      </div>

      <div className="mt-8 p-4 rounded-2xl bg-sib-warm border border-sib-stone">
        <p className="text-xs text-sib-muted leading-relaxed">
          Have questions about your privacy? Check our <Link to="/faq" className="text-sib-primary font-semibold underline underline-offset-2">FAQ</Link> or <Link to="/contact" className="text-sib-primary font-semibold underline underline-offset-2">contact our support team</Link> and we'll be happy to help.
        </p>
      </div>
    </div>
  )
}
