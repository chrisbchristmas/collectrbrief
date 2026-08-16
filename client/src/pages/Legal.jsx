import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Legal.module.css'

const SECTIONS = [
  { id: 'terms', label: 'Terms of Service' },
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'disclaimer', label: 'Financial Disclaimer' },
]

export default function Legal() {
  const navigate = useNavigate()
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } else {
      window.scrollTo(0, 0)
    }
  }, [hash])

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button className={styles.logo} onClick={() => navigate('/')}>CollectrBrief</button>
        <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>Get Your Brief →</button>
      </nav>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Legal</p>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className={styles.sidebarLink}>{s.label}</a>
          ))}
        </aside>

        {/* Content */}
        <main className={styles.content}>
          <p className={styles.effective}>Last updated: August 9, 2026</p>

          {/* ─── TERMS OF SERVICE ─── */}
          <section id="terms" className={styles.section}>
            <h1 className={styles.h1}>Terms of Service</h1>

            <p>These Terms of Service ("Terms") govern your use of the CollectrBrief website at <strong>www.collectrbrief.com</strong> and any related services (collectively, the "Service"). By subscribing or using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>

            <h2 className={styles.h2}>1. The Service</h2>
            <p>CollectrBrief is a subscription newsletter that delivers weekly market data, sold-price summaries, and editorial commentary for collectibles categories including sports cards, Pokémon, comics, coins, and similar items. Content is sourced from publicly available marketplace data (eBay, Goldin, TCGplayer, Lelands, SCP Auctions, Hake's, REA, PriceCharting, and others) and supplemented with AI-generated analysis.</p>

            <h2 className={styles.h2}>2. Subscription and Billing</h2>
            <p>CollectrBrief is offered on a monthly subscription basis at <strong>$9.99 per month</strong>. A 14-day free trial is available to new subscribers. Your credit card will be charged at the end of the trial period unless you cancel beforehand. Billing is handled by Stripe, Inc. and is subject to Stripe's terms and privacy policy. You authorise us to charge your payment method on a recurring monthly basis until you cancel.</p>

            <h2 className={styles.h2}>3. Cancellation and Refunds</h2>
            <p>You may cancel your subscription at any time via the "Manage Preferences" link in any brief email, or by emailing <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a>. Cancellation takes effect at the end of the current billing period — you will continue to receive briefs until that date. We do not offer partial-month refunds. If you believe a charge was made in error, contact us within 14 days and we will review it.</p>

            <h2 className={styles.h2}>4. Acceptable Use</h2>
            <p>You agree not to: (a) reproduce, redistribute, or resell brief content without written permission; (b) use the Service for any unlawful purpose; (c) attempt to gain unauthorised access to our systems; or (d) use automated tools to scrape, extract, or bulk-download content.</p>

            <h2 className={styles.h2}>5. Intellectual Property</h2>
            <p>All content produced by CollectrBrief — including editorial analysis, AI-written takes, formatting, and design — is owned by CollectrBrief. Underlying market data (sold prices, auction results) is sourced from third parties and remains subject to their respective terms. You are granted a personal, non-transferable licence to read and reference brief content for your own non-commercial use.</p>

            <h2 className={styles.h2}>6. Modifications to the Service</h2>
            <p>We reserve the right to modify, suspend, or discontinue the Service at any time. We will provide reasonable advance notice of material changes. Continued use after notice constitutes acceptance.</p>

            <h2 className={styles.h2}>7. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, CollectrBrief's total liability for any claim arising from use of the Service is limited to the amount you paid in the 30 days preceding the claim. We are not liable for indirect, incidental, consequential, or punitive damages of any kind.</p>

            <h2 className={styles.h2}>8. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Texas, United States, without regard to conflict-of-law principles. Any disputes shall be resolved in the courts of Texas.</p>

            <h2 className={styles.h2}>9. Contact</h2>
            <p>Questions about these Terms: <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
          </section>

          <hr className={styles.divider} />

          {/* ─── PRIVACY POLICY ─── */}
          <section id="privacy" className={styles.section}>
            <h1 className={styles.h1}>Privacy Policy</h1>

            <p>This Privacy Policy explains what personal data CollectrBrief collects, how it is used, and your rights. CollectrBrief is a solo-operated service run by a private individual in the United States.</p>

            <h2 className={styles.h2}>1. Data We Collect</h2>
            <p><strong>Information you provide:</strong> When you subscribe, we collect your email address, name (optional), collectibles niche, and watchlist items (the specific items you want tracked). If you subscribe via Stripe, your payment details are collected directly by Stripe — we never see or store your full card number.</p>
            <p><strong>Information collected automatically:</strong> We may collect basic usage data (delivery open/click events via SendGrid, browser type, and referral source from URL parameters) for the purpose of improving the Service.</p>

            <h2 className={styles.h2}>2. How We Use Your Data</h2>
            <ul className={styles.list}>
              <li>To send your weekly brief to your email address</li>
              <li>To personalise brief content based on your watchlist and niche</li>
              <li>To process your subscription payment via Stripe</li>
              <li>To send transactional emails (welcome, cancellation confirmation, preferences link)</li>
              <li>To improve the Service based on aggregate usage patterns</li>
            </ul>
            <p>We do not sell, rent, or share your personal data with third parties for their marketing purposes.</p>

            <h2 className={styles.h2}>3. Third-Party Services</h2>
            <p>We use the following sub-processors:</p>
            <ul className={styles.list}>
              <li><strong>Stripe</strong> — payment processing (Stripe's Privacy Policy applies to payment data)</li>
              <li><strong>SendGrid (Twilio)</strong> — email delivery</li>
              <li><strong>Render</strong> — hosting and infrastructure</li>
              <li><strong>Neon</strong> — database hosting (PostgreSQL)</li>
            </ul>

            <h2 className={styles.h2}>4. Data Retention</h2>
            <p>Your data is retained for as long as your subscription is active. After cancellation, we retain your data for up to 90 days in case you resubscribe, then delete it. You may request immediate deletion at any time by emailing <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a>.</p>

            <h2 className={styles.h2}>5. Your Rights</h2>
            <p>Depending on your location, you may have rights to access, correct, delete, or export your personal data. To exercise any of these rights, email <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a> and we will respond within 30 days.</p>

            <h2 className={styles.h2}>6. Cookies</h2>
            <p>CollectrBrief does not use advertising or tracking cookies. We may use a single session cookie for authentication on the preferences page. No data is sold to advertisers.</p>

            <h2 className={styles.h2}>7. Children's Privacy</h2>
            <p>The Service is not directed at children under 13. We do not knowingly collect data from children.</p>

            <h2 className={styles.h2}>8. Changes to This Policy</h2>
            <p>We will notify subscribers by email of material changes to this policy at least 7 days before they take effect.</p>

            <h2 className={styles.h2}>9. Contact</h2>
            <p>Privacy questions: <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
          </section>

          <hr className={styles.divider} />

          {/* ─── FINANCIAL DISCLAIMER ─── */}
          <section id="disclaimer" className={styles.section}>
            <h1 className={styles.h1}>Financial Disclaimer</h1>

            <p><strong>CollectrBrief is an informational newsletter service. It is not a financial adviser, investment adviser, broker, dealer, or fiduciary of any kind.</strong></p>

            <h2 className={styles.h2}>Not Financial or Investment Advice</h2>
            <p>All content published by CollectrBrief — including market summaries, sold-price data, trend analysis, and AI-generated "buy / hold / watch" editorial takes — is provided for <strong>informational and entertainment purposes only</strong>. Nothing in any CollectrBrief brief, email, or on this website constitutes financial advice, investment advice, a recommendation to buy or sell any asset, or a solicitation of any kind.</p>

            <h2 className={styles.h2}>Collectibles Are Not Regulated Investments</h2>
            <p>Sports cards, Pokémon cards, comics, coins, toys, and other collectibles are physical goods, not securities. Their markets are illiquid, thinly traded, subject to condition risk, and highly speculative. Past sale prices are not indicative of future value. Market conditions can change rapidly and without notice.</p>

            <h2 className={styles.h2}>AI-Generated Content</h2>
            <p>Some editorial commentary in CollectrBrief briefs is generated or assisted by artificial intelligence. AI-generated analysis may contain errors, omissions, or outdated information. It should not be relied upon as the sole basis for any purchasing or selling decision.</p>

            <h2 className={styles.h2}>No Guarantee of Accuracy</h2>
            <p>While we make reasonable efforts to source accurate sold-price data, we do not guarantee the accuracy, completeness, or timeliness of any information in our briefs. Data sourced from eBay, Goldin, TCGplayer, Lelands, SCP Auctions, Hake's, REA, PriceCharting, and other third parties is subject to their respective accuracy limitations.</p>

            <h2 className={styles.h2}>Your Own Due Diligence</h2>
            <p>Any buying, selling, or holding decision involving collectibles is your own responsibility. You should conduct your own research, consult qualified professionals where appropriate, and make decisions based on your own financial situation and risk tolerance. CollectrBrief is a research starting point, not a substitute for your own judgement.</p>

            <h2 className={styles.h2}>Limitation of Liability</h2>
            <p>CollectrBrief and its operators shall not be liable for any financial loss, damage, or harm arising from reliance on any content published in CollectrBrief briefs or on this website. By using the Service you acknowledge and accept this limitation.</p>
          </section>
        </main>
      </div>

      <footer className={styles.footer}>
        <div className="container">
          <p>© {new Date().getFullYear()} CollectrBrief · <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
        </div>
      </footer>
    </div>
  )
}
