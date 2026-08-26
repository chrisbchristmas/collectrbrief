import { useNavigate } from 'react-router-dom'
import useSeo from '../hooks/useSeo.js'
import styles from './Compare.module.css'

export default function ComparePage({ competitor, path, title, description, intro, rows, honestTitle, honestBody }) {
  const navigate = useNavigate()

  useSeo({ title, description, path })

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button className={styles.logo} onClick={() => navigate('/')}>CollectrBrief</button>
        <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>Get Your Brief →</button>
      </nav>

      <section className={styles.hero}>
        <span className="tag">Tool Comparison · 2026</span>
        <h1 className={styles.h1}>CollectrBrief vs {competitor}: Which Is Right for You?</h1>
        <p className={styles.intro}>{intro}</p>
      </section>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>CollectrBrief</th>
              <th>{competitor}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <th scope="row">{row.feature}</th>
                <td className={styles.usCol}>{row.us}</td>
                <td>{row.them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.honest}>
        <h2>{honestTitle}</h2>
        <p>{honestBody}</p>
      </div>

      <section className={styles.cta}>
        <h2>Stop checking prices manually</h2>
        <p>Get real sold prices and an AI buy/hold/watch take on your specific items, every Sunday. $9.99/month after a free 14-day trial.</p>
        <div className={styles.ctaButtons}>
          <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>Start My Free Trial</button>
          <a href="/" className={styles.secondaryLink}>See a Sample Brief</a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <p>© {new Date().getFullYear()} CollectrBrief · <a href="mailto:hello@collectrbrief.com">hello@collectrbrief.com</a></p>
          <p className={styles.compareLinks} style={{ fontSize: '0.8rem' }}>
            <a href="/legal#terms">Terms</a>
            <a href="/legal#privacy">Privacy</a>
            <a href="/legal#disclaimer">Disclaimer</a>
          </p>
          <p className={styles.compareLinks} style={{ fontSize: '0.8rem' }}>
            Compare: <a href="/compare/card-ladder">vs Card Ladder</a> · <a href="/compare/130point">vs 130point</a> · <a href="/compare/pricecharting">vs PriceCharting</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
