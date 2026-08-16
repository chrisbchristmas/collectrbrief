import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import styles from './Landing.module.css'
import PriceCheck from '../components/PriceCheck.jsx'

const NICHES = [
  {
    label: 'Sports Cards',
    emoji: '🏈',
    photo: 'photo-1607310073276-9f48dec47340',
  },
  {
    label: 'Pokémon',
    emoji: '⚡',
    photo: 'photo-1647892591880-58c55fd726d8',
  },
  {
    label: 'Vintage Comics',
    emoji: '💥',
    photo: 'photo-1689277037704-49a09b66f27f',
  },
  {
    label: 'Coins & Currency',
    emoji: '🪙',
    photo: 'photo-1643393670205-84815b8e7ff7',
  },
  {
    label: 'Vintage Toys',
    emoji: '🤖',
    photo: 'photo-1606663889134-b1dedb5ed8b7',
  },
  {
    label: 'Magic: The Gathering',
    emoji: '🧙',
    photo: 'photo-1620160573136-8e97a250aed2',
  },
  {
    label: 'Video Games',
    emoji: '🕹️',
    photo: 'photo-1696382447240-d07dff640d8e',
  },
  {
    label: 'Sports Memorabilia',
    emoji: '🏆',
    photo: 'photo-1745944756461-3bb53ca8419f',
  },
]

const FAQ_ITEMS = [
  {
    q: 'Is this financial advice?',
    a: 'No. CollectrBrief provides market data and editorial commentary for informational purposes only — not financial, investment, or legal advice. Collectibles are speculative and illiquid. Always do your own research before buying or selling. See our full Financial Disclaimer for details.',
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes, with one click from any brief email or your dashboard — no phone calls, no retention offers, no hoops. Cancel and you'll stop being charged at the end of your current billing period.",
  },
  {
    q: "What if my item isn't tracked yet?",
    a: "You control your own watchlist — add any specific item by name (player, set, grade, edition). If sold-price data exists on eBay, Goldin, TCGplayer, or the major auction houses, we'll find it. Obscure or ungraded items may return thinner data, which we'll tell you plainly rather than fabricate a number.",
  },
  {
    q: 'Is my data sold to anyone?',
    a: "No. We don't sell, rent, or share your data for third-party marketing, ever. Your email and watchlist exist solely to generate your weekly brief. Full details in our Privacy Policy.",
  },
  {
    q: 'How is this different from just checking eBay myself?',
    a: 'You could — and it would take you 20-30 minutes per item, every week, across multiple sites (eBay, Goldin, TCGplayer, auction houses), plus manually tracking whether prices are trending. CollectrBrief automates that entire process for up to 15 items and adds AI-written context on what the movement actually means.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [faqOpen, setFaqOpen] = useState(null)

  return (
    <div className={styles.page}>
      {/* REFERRAL BANNER */}
      <div className={styles.refBanner}>
        🎁 Give a friend a month free, get a month free yourself — <a href="#" onClick={(e) => { e.preventDefault(); navigate('/subscribe') }}>details after signup</a>
      </div>

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.logo}>CollectrBrief</div>
        <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>Get Your Brief →</button>
      </nav>

      {/* HERO — Pokémon top-right, sports cards bottom-left, MTG inner-left, memorabilia inner-right */}
      <section className={styles.hero}>
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHero1}`}
          src="https://images.unsplash.com/photo-1647892591880-58c55fd726d8?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHero2}`}
          src="https://images.unsplash.com/photo-1607310073276-9f48dec47340?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHero3}`}
          src="https://images.unsplash.com/photo-1620160573136-8e97a250aed2?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHero4}`}
          src="https://images.unsplash.com/photo-1745944756461-3bb53ca8419f?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <span className="tag">Weekly · Personalized · AI-Written</span>
        <h1 className={styles.heroTitle}>
          Know exactly what your<br />
          collection is worth — every week.
        </h1>
        <p className={styles.heroSub}>
          CollectrBrief watches your specific items across eBay, Goldin, TCGplayer, Lelands and more.
          Every Sunday you get real sold prices, trend direction, and a clear buy / hold / watch take.
          Not market news. Your items. Your prices.
        </p>
        <div className={styles.heroCta}>
          <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.9rem 2.25rem' }} onClick={() => navigate('/subscribe')}>
            Start my free 14-day trial
          </button>
          <p className={styles.heroNote}>$9.99/month after trial · Cancel anytime</p>
          <p style={{ marginTop: '0.5rem' }}>
            <a
              href={`${import.meta.env.VITE_API_URL || 'https://collectrbrief-api.onrender.com'}/sample`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '0.95rem', textDecoration: 'underline' }}
            >
              See a real sample brief →
            </a>
            {' · '}
            <a
              href={`${import.meta.env.VITE_API_URL || 'https://collectrbrief-api.onrender.com'}/trending`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#666', fontSize: '0.95rem', textDecoration: 'underline' }}
            >
              🔥 See this week's biggest movers →
            </a>
          </p>
        </div>

        <PriceCheck onSubscribeClick={() => navigate('/subscribe')} />
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
                <div>Base Set Charizard Holo PSA 10 → <strong>$7,250</strong> <span>Goldin</span></div>
                <div>1999 Charizard #4 PSA 10 → <strong>$6,950</strong> <span>TCGplayer</span></div>
              </div>
            </div>
            <div className={styles.emailItem}>
              <div className={styles.itemLabel}>➡️ 1952 Topps Mickey Mantle SGC 4</div>
              <div className={styles.itemStats}>5 sales · avg <strong>$18,200</strong> · range $17,000–$19,500 · trend: <span style={{ color: '#6b7280' }}>stable</span></div>
            </div>
            <div className={styles.emailTake}>
              <div className={styles.takeLabel}>Market Take</div>
              <p><strong>PSA 10 Charizard Base Set</strong> — Supply tightened this week with only 12 recorded sales, while avg moved up 3.4% from last week's $7,002. The Goldin result at $7,250 confirms the floor is holding. <strong>BUY</strong> if you're targeting under $7,000 — that window is closing.</p>
              <p style={{ marginTop: '0.75rem' }}><strong>1952 Topps Mantle SGC 4</strong> — Volume is thin and pricing is flat. No catalyst on the horizon. <strong>HOLD</strong> what you have, pass on anything priced over comps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF STRIP — verifiable claims only */}
      <section className={styles.preview} style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem', maxWidth: 860, margin: '0 auto',
          }}>
            {[
              { stat: '7 marketplaces', body: 'eBay, Goldin, TCGplayer, Lelands, SCP, Hake\u2019s & REA — one clean feed.' },
              { stat: 'Real sold prices', body: 'Actual completed sales — never asking prices or estimates. Check the sample brief and verify every listing yourself.' },
              { stat: 'True final prices', body: 'Best-offer sales show the negotiated price, not the sticker. Most trackers can\u2019t see this.' },
              { stat: 'No lock-in', body: '14-day free trial, cancel in two clicks from any email. Your data is deleted on request.' },
            ].map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: '1.1rem 1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.02rem', marginBottom: '0.3rem' }}>{p.stat}</div>
                <div style={{ color: '#666', fontSize: '0.85rem', lineHeight: 1.5 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — comics top-right, coins bottom-left, video games mid-right, toys top-left */}
      <section className={styles.how}>
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHow1}`}
          src="https://images.unsplash.com/photo-1689277037704-49a09b66f27f?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHow2}`}
          src="https://images.unsplash.com/photo-1643393670205-84815b8e7ff7?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHow3}`}
          src="https://images.unsplash.com/photo-1696382447240-d07dff640d8e?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoHow4}`}
          src="https://images.unsplash.com/photo-1606663889134-b1dedb5ed8b7?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <div className="container">
          <h2 className={styles.sectionTitle}>Set it up in 2 minutes</h2>
          <div className={styles.steps}>
            {[
              { n: '1', title: 'Tell us what you collect', body: 'Sports cards, Pokémon, comics, coins — choose your niche.' },
              { n: '2', title: 'Build your watchlist', body: 'Add up to 15 specific items: player names, sets, grades, or card titles.' },
              { n: '3', title: 'Receive your brief every Sunday', body: 'Real sold prices from eBay, Goldin, TCGplayer & more, trend analysis, and an AI-written market take.' },
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

      {/* NICHES — photo card grid */}
      <section className={styles.niches}>
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoNiches1}`}
          src="https://images.unsplash.com/photo-1620160573136-8e97a250aed2?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoNiches2}`}
          src="https://images.unsplash.com/photo-1647892591880-58c55fd726d8?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>Works for any collecting niche</h2>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: 520, margin: '0 auto 2.5rem', lineHeight: 1.65 }}>
            Whatever you collect, CollectrBrief tracks it. Pick your niche and we handle the rest.
          </p>
          <div className={styles.nicheGrid}>
            {NICHES.map(n => (
              <button
                key={n.label}
                className={styles.nicheCard}
                onClick={() => navigate('/subscribe')}
              >
                <div className={styles.nicheImgWrap}>
                  <img
                    src={`https://images.unsplash.com/${n.photo}?w=400&h=300&fit=crop&q=80&auto=format`}
                    alt={n.label}
                    className={styles.nicheImg}
                    loading="eager"
                  />
                  <div className={styles.nicheOverlay} />
                </div>
                <div className={styles.nicheLabel}>
                  <span className={styles.nicheEmoji}>{n.emoji}</span>
                  {n.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — vintage toys left, video games right, Pokémon top-right, sports cards bottom-left */}
      <section className={styles.pricing}>
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoPricing1}`}
          src="https://images.unsplash.com/photo-1606663889134-b1dedb5ed8b7?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoPricing2}`}
          src="https://images.unsplash.com/photo-1696382447240-d07dff640d8e?w=500&h=500&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoPricing3}`}
          src="https://images.unsplash.com/photo-1647892591880-58c55fd726d8?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <img aria-hidden="true" className={`${styles.deco} ${styles.decoPricing4}`}
          src="https://images.unsplash.com/photo-1607310073276-9f48dec47340?w=400&h=400&fit=crop&q=70&auto=format" alt="" />
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className={styles.sectionTitle}>Simple pricing</h2>
          <div className={styles.priceCard}>
            <div className={styles.priceAmount}>$9.99<span>/month</span></div>
            <p className={styles.priceDesc}>Everything included. No tiers, no add-ons.</p>
            <ul className={styles.priceFeatures}>
              <li>✓ Up to 15 watchlist items</li>
              <li>✓ Weekly sold prices from eBay, Goldin, TCGplayer & more</li>
              <li>✓ AI-written buy / hold / watch take</li>
              <li>✓ Price trend analysis (up / stable / down)</li>
              <li>✓ Grading premium & marketplace spread insights</li>
              <li>✓ Price alerts by email + instant Discord</li>
              <li>✓ PriceCharting reference prices</li>
              <li>✓ Cancel anytime</li>
            </ul>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', fontSize: '1.05rem' }} onClick={() => navigate('/subscribe')}>
              Start free 14-day trial
            </button>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.75rem' }}>No charge for 14 days · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className={styles.founder}>
        <div className="container" style={{ maxWidth: 620 }}>
          <p className={styles.founderEyebrow}>Why I built this</p>
          <p className={styles.founderQuote}>
            "I got tired of manually checking eBay sold listings every week to see what my own
            cards were worth. Spreadsheets, alerts, tab-hopping — it was a chore. So I built the
            tool I wanted: my exact items, real sold prices, a plain-English take, delivered every
            Sunday morning. No noise, no generic 'market news.' Just the numbers that matter to
            my collection."
          </p>
          <p className={styles.founderSign}>— Chris, founder of CollectrBrief</p>
        </div>
      </section>

      {/* FAQ */}
      <section className={styles.faq}>
        <div className="container" style={{ maxWidth: 680 }}>
          <h2 className={styles.sectionTitle}>Questions collectors actually ask</h2>
          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  aria-expanded={faqOpen === i}
                >
                  <span>{item.q}</span>
                  <span className={styles.faqToggle}>{faqOpen === i ? '−' : '+'}</span>
                </button>
                {faqOpen === i && <p className={styles.faqAnswer}>{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQ_ITEMS.map(item => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            }),
          }}
        />
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className="container">
          <p>© {new Date().getFullYear()} CollectrBrief · <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
          <p style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}>
            <a href="/legal#terms" style={{ color: '#888', marginRight: '1.25rem' }}>Terms of Service</a>
            <a href="/legal#privacy" style={{ color: '#888', marginRight: '1.25rem' }}>Privacy Policy</a>
            <a href="/legal#disclaimer" style={{ color: '#888' }}>Financial Disclaimer</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
