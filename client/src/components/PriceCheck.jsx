import { useState } from 'react'
import styles from './PriceCheck.module.css'

const API = import.meta.env.VITE_API_URL || 'https://collectrbrief-api.onrender.com'

export default function PriceCheck({ onSubscribeClick }) {
  const [keywords, setKeywords] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [showEmailGate, setShowEmailGate] = useState(false)

  async function runCheck(e) {
    e?.preventDefault()
    if (keywords.trim().length < 3) {
      setError('Enter an item name, e.g. "PSA 10 Charizard Base Set"')
      return
    }
    // First submission: require email before showing the real result
    if (!result && !showEmailGate) {
      setShowEmailGate(true)
      return
    }
    if (showEmailGate && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email to see your free result')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/public/price-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const trendColor = { up: '#16a34a', down: '#dc2626', stable: '#6b7280' }
  const trendIcon = { up: '📈', down: '📉', stable: '➡️' }

  return (
    <div className={styles.widget}>
      <p className={styles.eyebrow}>Try it free — no signup required to search</p>
      <h3 className={styles.title}>What's your item worth right now?</h3>
      <p className={styles.sub}>One free lookup. Real sold prices from the last 14 days.</p>

      <form onSubmit={runCheck} className={styles.form}>
        <input
          type="text"
          placeholder="e.g. PSA 10 Charizard Base Set Holo"
          value={keywords}
          onChange={e => { setKeywords(e.target.value); setResult(null); setShowEmailGate(false) }}
          className={styles.input}
          disabled={loading || Boolean(result)}
        />

        {showEmailGate && !result && (
          <input
            type="email"
            placeholder="Your email — we'll show your result here"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={styles.input}
            autoFocus
          />
        )}

        {!result && (
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Checking sold prices…' : showEmailGate ? 'Show my free result →' : 'Check price →'}
          </button>
        )}
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.result}>
          <div className={styles.resultHeader}>
            <span>{trendIcon[result.trend.trend] || '➡️'}</span>
            <strong>{result.keywords}</strong>
          </div>
          <div className={styles.resultStats}>
            {result.trend.count} sales · avg <strong>${result.trend.avg.toLocaleString()}</strong> · range ${result.trend.min.toLocaleString()}–${result.trend.max.toLocaleString()} ·{' '}
            <span style={{ color: trendColor[result.trend.trend] }}>{result.trend.trend}</span>
          </div>
          {result.recentSales.slice(0, 3).map((s, i) => (
            <div key={i} className={styles.saleRow}>
              <span>{s.title.slice(0, 48)}</span>
              <strong>${s.price.toLocaleString()}</strong>
            </div>
          ))}
          <div className={styles.upsell}>
            <p>This was one item, checked once. CollectrBrief tracks up to 15 items automatically, every Sunday, with trend alerts.</p>
            <button className="btn btn-primary" onClick={onSubscribeClick} style={{ width: '100%' }}>
              Track this + 14 more free for 14 days →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
