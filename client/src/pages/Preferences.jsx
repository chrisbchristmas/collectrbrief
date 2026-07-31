import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Onboarding.module.css'

const NICHES = [
  'Sports Cards', 'Pokémon', 'Vintage Comics', 'Coins & Currency',
  'Magic: The Gathering', 'Vintage Toys', 'Video Games', 'Sports Memorabilia', 'Other'
]

export default function Preferences() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const token = params.get('token')

  const [status, setStatus] = useState('loading') // loading | ready | saving | saved | error | denied
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [niche, setNiche] = useState('')
  const [watchlist, setWatchlist] = useState([])

  const API = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    if (!id || !token) { setStatus('denied'); return }
    fetch(`${API}/api/subscribers/${id}?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.status === 403) { setStatus('denied'); return null }
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load')
        return res.json()
      })
      .then(data => {
        if (!data) return
        setEmail(data.email)
        setFirstName(data.first_name || '')
        setNiche(data.niche || '')
        const wl = typeof data.watchlist === 'string' ? JSON.parse(data.watchlist) : (data.watchlist || [])
        // Normalize: items may be strings or {label, keywords, purchase_price}
        setWatchlist(wl.map(w => typeof w === 'string'
          ? { label: w, keywords: w, purchase_price: '' }
          : { label: w.label || '', keywords: w.keywords || w.label || '', purchase_price: w.purchase_price || '' }))
        setStatus('ready')
      })
      .catch(err => { setError(err.message); setStatus('error') })
  }, [id, token])

  const updateItem = (i, field, val) =>
    setWatchlist(w => w.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  const addItem = () => watchlist.length < 15 && setWatchlist(w => [...w, { label: '', keywords: '', purchase_price: '' }])
  const removeItem = (i) => setWatchlist(w => w.filter((_, idx) => idx !== i))

  const valid = niche && watchlist.length > 0 && watchlist.every(w => w.label.trim() && w.keywords.trim())

  async function save() {
    setStatus('saving')
    setError('')
    try {
      const res = await fetch(`${API}/api/subscribers/${id}?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim() || null,
          niche,
          watchlist: watchlist.map(w => ({
            label: w.label.trim(),
            keywords: w.keywords.trim(),
            ...(Number(w.purchase_price) > 0 ? { purchase_price: Number(w.purchase_price) } : {}),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setStatus('saved')
      setTimeout(() => setStatus('ready'), 2500)
    } catch (err) {
      setError(err.message)
      setStatus('ready')
    }
  }

  if (status === 'loading') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card"><p style={{ textAlign: 'center', color: '#888' }}>Loading your preferences…</p></div></div>
    </div>
  )

  if (status === 'denied') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card">
        <h2 className={styles.stepTitle}>Link invalid or expired</h2>
        <p className={styles.stepSub}>Use the "Manage preferences" link from your most recent brief email to access this page.</p>
      </div></div>
    </div>
  )

  if (status === 'error') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card"><p className={styles.error}>{error}</p></div></div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}>
        <div className="card">
          <h2 className={styles.stepTitle}>Your preferences</h2>
          <p className={styles.stepSub}>{email}</p>

          <div className={styles.field}>
            <label>First name</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>

          <div className={styles.field}>
            <label>Niche</label>
            <select value={niche} onChange={e => setNiche(e.target.value)}>
              <option value="">Select your niche…</option>
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
              {niche && !NICHES.includes(niche) && <option value={niche}>{niche}</option>}
            </select>
          </div>

          <h3 style={{ margin: '1.5rem 0 0.25rem', fontSize: '1.05rem' }}>Watchlist</h3>
          <p className={styles.stepSub}>The items tracked in your Sunday brief.</p>

          {watchlist.map((item, i) => (
            <div key={i} className={styles.watchItem}>
              <div className={styles.watchItemHeader}>
                <span className={styles.watchItemNum}>#{i + 1}</span>
                {watchlist.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => removeItem(i)}>✕</button>
                )}
              </div>
              <div className={styles.field}>
                <label>Display name</label>
                <input type="text" value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Search keywords</label>
                <input type="text" value={item.keywords} onChange={e => updateItem(i, 'keywords', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>What you paid <span style={{ color: '#999', fontWeight: 400 }}>(optional — unlocks portfolio tracking in your brief)</span></label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 850" value={item.purchase_price} onChange={e => updateItem(i, 'purchase_price', e.target.value)} />
              </div>
            </div>
          ))}

          {watchlist.length < 15 && (
            <button className={styles.addBtn} onClick={addItem}>+ Add another item ({watchlist.length}/15)</button>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem' }}
            disabled={!valid || status === 'saving'}
            onClick={save}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save changes'}
          </button>

          <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: '#f7f4ee', borderRadius: 8, border: '1px dashed #ccc' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>🎁 Give a month, get a month</p>
            <p style={{ margin: '0.35rem 0 0.6rem', color: '#666', fontSize: '0.85rem' }}>Share your link — when a friend subscribes, you get a free month credited automatically.</p>
            <input
              readOnly
              value={`https://www.collectrbrief.com/subscribe?ref=${id}`}
              onFocus={e => e.target.select()}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box', background: '#fff' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
