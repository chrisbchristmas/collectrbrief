import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

const NICHES = ['Sports Cards', 'Pokémon', 'Vintage Comics', 'Coins & Currency', 'Vintage Toys', 'Magic: The Gathering', 'Video Games', 'Sports Memorabilia', 'Other']

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.logo}>CollectrBrief</div>
        <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>Get Your Brief →</button>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <span className="tag">Weekly · Personalized · AI-Written</span>
        <h1 className={styles.heroTitle}>
          Know exactly what your<br />
          collection is worth — every week.
        </h1>
        <p className={styles.heroSub}>
          CollectrBrief watches your specific items on eBay, Heritage, and Fanatics.
          Every Sunday you get sold prices, trend direction, and a clear buy / hold / watch take.
          Not market news. Your items. Your prices.
        </p>
        <div className={styles.heroCta}>
          <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.9rem 2.25rem' }} onClick={() => navigate('/subscribe')}>
            Start my free 14-day trial
          </button>
          <p className={styles.heroNote}>$9.99/month after trial · Cancel anytime</p>
        </div>
      </section>

      {/* SAMPLE BRIEF PREVIEW */}
      <section className={styles.preview}>
        <div className="container">
          <h2 className={styles.sectionTitle}>What lands in your inbox</h2>
          <div className={styles.emailMock}>
            <div className={styles.emailHeader}>
              <strong>CollectrBrief</strong>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>Week of July 27, 2025</span>
            </div>
            <div className={styles.emailItem}>
              <div className={styles.itemLabel}>📈 PSA 10 Charizard Base Set</div>
              <div className={styles.itemStats}>12 sales · avg <strong>$7,240</strong> · range $6,800–$7,900 · trend: <span style={{ color: '#16a34a' }}>up</span></div>
              <div className={styles.itemSales}>
                <div>Charizard Holo Base Set PSA 10 → <strong>$7,400</strong> <span>eBay</span></div>
                <div>Base Set Charizard Holo PSA 10 → <strong>$7,250</strong> <span>Heritage</span></div>
                <div>1999 Charizard #4 PSA 10 → <strong>$6,950</strong> <span>Fanatics</span></div>
              </div>
            </div>
            <div className={styles.emailItem}>
              <div className={styles.itemLabel}>➡️ 1952 Topps Mickey Mantle SGC 4</div>
              <div className={styles.itemStats}>5 sales · avg <strong>$18,200</strong> · range $17,000–$19,500 · trend: <span style={{ color: '#6b7280' }}>stable</span></div>
            </div>
            <div className={styles.emailTake}>
              <div className={styles.takeLabel}>Market Take</div>
              <p><strong>PSA 10 Charizard Base Set</strong> — Supply tightened this week with only 12 recorded sales, while avg moved up 3.4% from last week's $7,002. The Heritage result at $7,250 confirms the floor is holding. <strong>BUY</strong> if you're targeting under $7,000 — that window is closing.</p>
              <p style={{ marginTop: '0.75rem' }}><strong>1952 Topps Mantle SGC 4</strong> — Volume is thin and pricing is flat. No catalyst on the horizon. <strong>HOLD</strong> what you have, pass on anything priced over comps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.how}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Set it up in 2 minutes</h2>
          <div className={styles.steps}>
            {[
              { n: '1', title: 'Tell us what you collect', body: 'Sports cards, Pokémon, comics, coins — choose your niche.' },
              { n: '2', title: 'Build your watchlist', body: 'Add up to 15 specific items: player names, sets, grades, or card titles.' },
              { n: '3', title: 'Receive your brief every Sunday', body: 'Sold prices from eBay, Heritage & Fanatics, trend analysis, and an AI-written market take.' },
            ].map(s => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NICHES */}
      <section className={styles.niches}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>Works for any collecting niche</h2>
          <div className={styles.nicheGrid}>
            {NICHES.map(n => <span key={n} className="tag" style={{ margin: '0.3rem' }}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className={styles.pricing}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>Simple pricing</h2>
          <div className={styles.priceCard}>
            <div className={styles.priceAmount}>$9.99<span>/month</span></div>
            <p className={styles.priceDesc}>Everything included. No tiers, no add-ons.</p>
            <ul className={styles.priceFeatures}>
              <li>✓ Up to 15 watchlist items</li>
              <li>✓ Weekly sold prices from eBay, Heritage & Fanatics</li>
              <li>✓ AI-written buy / hold / watch take</li>
              <li>✓ Price trend analysis (up / stable / down)</li>
              <li>✓ PriceCharting reference prices</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', fontSize: '1.05rem' }} onClick={() => navigate('/subscribe')}>
              Start free 14-day trial
            </button>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.75rem' }}>No credit card required to start</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className="container">
          <p>© {new Date().getFullYear()} CollectrBrief · <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
        </div>
      </footer>
    </div>
  )
}
