import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Onboarding.module.css'

const API = import.meta.env.VITE_API_URL || ''

// /add-item?id=<subscriberId>&token=<magicToken>&title=<scraped page title>
// Destination for the "Add to CollectrBrief" bookmarklet — lets a subscriber
// add an item to their watchlist straight from an eBay/TCGplayer listing page
// without retyping keywords from scratch.
export default function AddItem() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const token = params.get('token')
  const scrapedTitle = (params.get('title') || '').slice(0, 200)

  const [label, setLabel] = useState(scrapedTitle)
  const [keywords, setKeywords] = useState(scrapedTitle)
  const [status, setStatus] = useState('ready') // ready | saving | done | denied | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id || !token) setStatus('denied')
  }, [id, token])

  async function save(e) {
    e?.preventDefault()
    if (!label.trim() || !keywords.trim()) return
    setStatus('saving')
    try {
      const res = await fetch(`${API}/api/subscribers/${id}/watchlist-item?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), keywords: keywords.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add item')
      setMessage(data.added === false ? (data.message || 'Already on your watchlist') : `Added — ${data.count}/15 items tracked`)
      setStatus('done')
    } catch (err) {
      setMessage(err.message)
      setStatus('error')
    }
  }

  if (status === 'denied') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card">
        <h2 className={styles.stepTitle}>Link invalid or expired</h2>
        <p className={styles.stepSub}>Use the "Add to CollectrBrief" bookmarklet from your dashboard, or add items manually in Preferences.</p>
        <p style={{ marginTop: 16 }}><a href="/" style={{ color: '#1a1a1a', fontWeight: 700 }}>Go to CollectrBrief →</a></p>
      </div></div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}>
        <div className="card">
          <h2 className={styles.stepTitle}>Add to your watchlist</h2>
          <p className={styles.stepSub}>Confirm the item name — we'll start tracking sold prices for it starting this Sunday.</p>

          {status === 'done' ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#166534' }}>✓ {message}</p>
              <p style={{ marginTop: 16 }}>
                <a href={`/dashboard?id=${id}&token=${token}`} style={{ color: '#1a1a1a', fontWeight: 700 }}>View your dashboard →</a>
              </p>
            </div>
          ) : (
            <form onSubmit={save}>
              <div className={styles.field}>
                <label>Display name</label>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
              </div>
              <div className={styles.field}>
                <label>Search keywords <span style={{ color: '#999', fontWeight: 400 }}>(what we search for sold prices)</span></label>
                <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} />
              </div>
              {status === 'error' && <p className={styles.error}>{message}</p>}
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={status === 'saving' || !label.trim() || !keywords.trim()}
              >
                {status === 'saving' ? 'Adding…' : 'Add to watchlist'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
