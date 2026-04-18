import React from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import PolicyLayout, { PolicySection, PolicyBullets } from '../components/PolicyLayout'

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      icon={Lock}
      title="Privacy Policy"
      lastUpdated="January 2025"
    >
      <PolicySection number={1} title="Information we collect">
        <p className="mb-2">
          When you create an account on Sib, we collect your name, email address, username,
          and location. When you list items or make purchases, we also collect:
        </p>
        <PolicyBullets items={[
          'Transaction-related information such as delivery addresses, order history, and payment details (processed securely via third-party providers)',
          'Messages sent between buyers and sellers through the in-app chat',
          'Photos and descriptions uploaded as part of listings',
          'Device information and usage data (anonymised) to improve the platform',
          'Dispute-related evidence such as photos, videos, and descriptions submitted during the dispute process',
        ]} />
      </PolicySection>

      <PolicySection number={2} title="How we use your data">
        <p className="mb-2">We use the information we collect to:</p>
        <PolicyBullets items={[
          'Provide, maintain, and improve the Sib marketplace',
          'Process transactions, facilitate delivery, and send related notifications',
          'Facilitate communication between buyers and sellers',
          'Manage the dispute resolution process',
          'Prevent fraud, abuse, and enforce our terms of service',
          'Send you updates about your account, orders, and the platform',
          'Improve and personalise your experience on Sib',
        ]} />
      </PolicySection>

      <PolicySection number={3} title="Data sharing">
        <p className="mb-2">
          We do not sell your personal data. We share limited information only when necessary:
        </p>
        <PolicyBullets items={[
          'With payment providers to process transactions securely',
          'With our logistics partners to facilitate collection and delivery of items',
          'With law enforcement or regulatory authorities if legally required',
          'With the other party in a dispute, where necessary for resolution (limited to relevant transaction details)',
        ]} />
        <p className="mt-2">
          Buyers and sellers may see each other's username, location, and rating
          as part of normal marketplace operations.
        </p>
      </PolicySection>

      <PolicySection number={4} title="Data storage and security">
        <p className="mb-2">
          Your data is stored securely using industry-standard encryption and hosted on
          trusted infrastructure providers. We implement appropriate technical and organisational
          measures to protect your personal information against unauthorised access, loss, or misuse.
        </p>
        <p>
          While we take reasonable steps to safeguard your information, no method of electronic
          storage or transmission is entirely secure. Sib shall not be held liable for any loss,
          damage, or unauthorised access to your data arising from circumstances beyond our
          reasonable control, including but not limited to cyberattacks, force majeure events, or
          vulnerabilities in third-party services. We are committed to promptly addressing any
          security incidents in accordance with our obligations under applicable data protection law.
        </p>
      </PolicySection>

      <PolicySection number={5} title="Your rights">
        <p className="mb-2">Under applicable data protection laws (including the GDPR), you have the right to:</p>
        <PolicyBullets items={[
          'Access and receive a copy of your personal data',
          'Correct inaccurate or incomplete data',
          'Request deletion of your account and associated data',
          'Object to or restrict certain processing of your data',
          'Data portability — receive your data in a commonly used format',
          'Withdraw consent at any time (where processing is based on consent)',
          'Lodge a complaint with a supervisory authority',
        ]} />
        <p className="mt-2">
          To exercise any of these rights, please{' '}
          <Link to="/contact" className="text-sib-primary font-semibold underline underline-offset-2">contact our support team</Link>.
        </p>
      </PolicySection>

      <PolicySection number={6} title="Data retention">
        <p>
          We retain your personal data for as long as your account is active or as needed to
          provide our services. If you delete your account, we will remove your personal data
          within a reasonable timeframe, unless we are legally required to retain it (e.g. for
          tax, fraud prevention, or regulatory purposes). Transaction records may be retained
          for up to 7 years in accordance with applicable legal requirements.
        </p>
      </PolicySection>

      <PolicySection number={7} title="Cookies and analytics">
        <p>
          Sib uses essential cookies to keep you logged in and maintain your session. We may
          also use anonymised analytics to understand how the platform is used and to improve
          the user experience. We do not use third-party advertising cookies.
        </p>
        <p className="mt-2">
          For full details, see our <Link to="/cookies" className="text-sib-primary font-semibold underline underline-offset-2">Cookie Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection number={8} title="Children's privacy">
        <p>
          Sib is not intended for use by anyone under the age of 18. We do not knowingly
          collect personal data from minors. If we discover that a user is under 18, we will
          take steps to delete their account and associated data.
        </p>
      </PolicySection>

      <PolicySection number={9} title="International data transfers">
        <p>
          Your data may be processed and stored on servers located outside of Malta or the European
          Economic Area. Where this occurs, we ensure that appropriate safeguards are in place
          in accordance with applicable data protection law, including standard contractual clauses
          or equivalent mechanisms.
        </p>
      </PolicySection>

      <PolicySection number={10} title="Changes to this policy">
        <p>
          We may update this privacy policy from time to time. If we make significant changes,
          we will notify users through the app. Continued use of Sib after changes means you
          accept the updated policy.
        </p>
      </PolicySection>
    </PolicyLayout>
  )
}
