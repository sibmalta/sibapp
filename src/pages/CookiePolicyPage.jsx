import React from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets } from '../components/PolicyLayout'

export default function CookiePolicyPage() {
  return (
    <PolicyLayout
      icon={Cookie}
      title="Cookie Policy"
      subtitle="How Sib uses cookies and similar technologies."
      lastUpdated="January 2025"
    >
      <PolicySection number={1} title="What are cookies?">
        <p>
          Cookies are small text files that are stored on your device when you visit a website
          or use an app. They help the site remember your preferences, keep you logged in,
          and understand how you interact with the platform.
        </p>
      </PolicySection>

      <PolicySection number={2} title="How Sib uses cookies">
        <p className="mb-2">Sib uses cookies and similar technologies for the following purposes:</p>
        <PolicyBullets items={[
          'Essential cookies — to keep you logged in, maintain your session, and ensure the platform functions correctly',
          'Security cookies — to protect against fraud and unauthorised access to your account',
          'Preference cookies — to remember your settings, language preferences, and display options',
          'Analytics cookies — to understand how users interact with the platform, which features are most used, and where improvements can be made',
        ]} />
      </PolicySection>

      <PolicySection number={3} title="Types of cookies we use">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-sib-text border border-sib-stone rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-sib-warm">
                <th className="text-left px-3 py-2.5 font-semibold border-b border-sib-stone">Type</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-sib-stone">Purpose</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-sib-stone">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sib-stone">
              <tr>
                <td className="px-3 py-2.5 font-medium">Essential</td>
                <td className="px-3 py-2.5 text-sib-muted">Authentication, session management, security</td>
                <td className="px-3 py-2.5 text-sib-muted">Session / 30 days</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium">Preferences</td>
                <td className="px-3 py-2.5 text-sib-muted">Remembering your settings and display choices</td>
                <td className="px-3 py-2.5 text-sib-muted">1 year</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-medium">Analytics</td>
                <td className="px-3 py-2.5 text-sib-muted">Anonymised usage data to improve the platform</td>
                <td className="px-3 py-2.5 text-sib-muted">Up to 2 years</td>
              </tr>
            </tbody>
          </table>
        </div>
      </PolicySection>

      <PolicySection number={4} title="Third-party cookies">
        <p>
          Sib may use third-party services that set their own cookies, such as payment processors
          (e.g. Stripe) and analytics providers. These cookies are governed by the respective
          third party's privacy and cookie policies. Sib does not use third-party advertising cookies.
        </p>
      </PolicySection>

      <PolicySection number={5} title="Managing cookies">
        <p className="mb-2">
          You can manage or disable cookies through your browser settings. Please note that
          disabling essential cookies may prevent you from using certain features of Sib,
          including logging in and making purchases.
        </p>
        <PolicyBullets items={[
          'Most browsers allow you to view, manage, and delete cookies in the settings or preferences menu',
          'You can set your browser to block cookies or alert you when cookies are being set',
          'Clearing cookies will log you out of Sib and reset your preferences',
        ]} />
      </PolicySection>

      <PolicySection number={6} title="Local storage">
        <p>
          In addition to cookies, Sib may use browser local storage and session storage
          to store authentication tokens and app preferences. These function similarly to cookies
          but are managed through the browser's web storage API rather than as traditional cookies.
        </p>
      </PolicySection>

      <PolicySection number={7} title="Changes to this policy">
        <p>
          We may update this cookie policy from time to time. If we make significant changes,
          we will notify users through the app. Continued use of Sib after changes means you
          accept the updated policy.
        </p>
      </PolicySection>

      <PolicySection number={8} title="Contact">
        <p>
          If you have questions about how Sib uses cookies, please{' '}
          <Link to="/contact" className="text-sib-primary font-semibold underline underline-offset-2">contact our support team</Link>.
          For more on how we handle your data, see our{' '}
          <Link to="/privacy" className="text-sib-primary font-semibold underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
