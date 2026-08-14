import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './Onboarding.module.css'
import ExitIntent from '../components/ExitIntent.jsx'

const NICHES = [
  'Sports Cards', 'Pokémon', 'Vintage Comics', 'Coins & Currency',
  'Magic: The Gathering', 'Vintage Toys', 'Video Games', 'Sports Memorabilia', 'Other'
]
const STEPS = ['Your details', 'Your watchlist', 'Review & subscribe']

export default function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ref = params.get('ref') || ''
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ email: '', first_name: '', niche: '' })
  const [watchlist, setWatchlist] = useState([{ label: '', keywords: '' }])
  const [plan, setPlan] = useState('monthly')
  const [annualEnabled, setAnnualEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || ''
    fetch(`${API}/api/config`).then(r => r.json()).then(c => setAnnualEnabled(Boolean(c.annualEnabled))).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const addItem = () => {
    if (watchlist.length >= 15) return
    setWatchlist(w => [...w, { label: '', keywords: '' }])
  }

  const updateItem = (i, field, val) => {
    setWatchlist(w => w.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  const removeItem = (i) => {
    setWatchlist(w => w.filter((_, idx) => idx !== i))
  }

  const validStep0 = form.email.includes('@') && form.niche
  const validStep1 = watchlist.length > 0 && watchlist.every(w => w.label.trim() && w.keywords.trim())

  async function submit() {
    setLoading(true)
    setError('')
    try {
      const API = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API}/api/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          first_name: form.first_name.trim() || null,
          niche: form.niche,
          watchlist: watchlist.map(w => ({ label: w.label.trim(), keywords: w.keywords.trim() })),
          plan,
          ref: ref || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl
      } else {
        // No Stripe configured — dev mode
        navigate('/success')
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <ExitIntent />
      <div className={styles.header}>
        <a href="/" className={styles.logo}>CollectrBrief</a>
      </div>

      <div className={styles.wrapper}>
        {/* Progress */}
        <div className={styles.progress}>
          {STEPS.map((s, i) => (
            <div key={s} className={`${styles.progressStep} ${i <= step ? styles.active : ''}`}>
              <div className={styles.progressDot}>{i < step ? '✓' : i + 1}</div>
              <span className={styles.progressLabel}>{s}</span>
            </div>
          ))}
        </div>

        <div className="card">
          {/* Step 0 — Details */}
          {step === 0 && (
            <div>
              <h2 className={styles.stepTitle}>Tell us about yourself</h2>
              <p className={styles.stepSub}>Takes 2 minutes. Your brief arrives this Sunday.</p>
              <div className={styles.field}>
                <label>Email address *</label>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>First name <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" placeholder="Alex" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>What do you collect? *</label>
                <select value={form.niche} onChange={e => set('niche', e.target.value)}>
                  <option value="">Select your niche…</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={!validStep0} onClick={() => setStep(1)}>
                Next →
              </button>
            </div>
          )}

          {/* Step 1 — Watchlist */}
          {step === 1 && (
            <div>
              <h2 className={styles.stepTitle}>Build your watchlist</h2>
              <p className={styles.stepSub}>Add the specific items you want tracked. Be as specific as possible — e.g. "PSA 10 1999 Charizard Base Set" not just "Charizard".</p>

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
                    <input type="text" placeholder="e.g. PSA 10 Charizard Base Set" value={item.label} onChange={e => updateItem(i, 'label', e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>Search keywords <span style={{ color: '#999', fontWeight: 400 }}>(what we search on eBay/Heritage)</span></label>
                    <input type="text" placeholder="e.g. Charizard base set holo PSA 10" value={item.keywords} onChange={e => updateItem(i, 'keywords', e.target.value)} />
                  </div>
                </div>
              ))}

              {watchlist.length < 15 && (
                <button className={styles.addBtn} onClick={addItem}>+ Add another item ({watchlist.length}/15)</button>
              )}

              <div className={styles.stepNav}>
                <button className={styles.backBtn} onClick={() => setStep(0)}>← Back</button>
                <button className="btn btn-primary" disabled={!validStep1} onClick={() => setStep(2)}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Review */}
          {step === 2 && (
            <div>
              <h2 className={styles.stepTitle}>Review & start your trial</h2>
              <p className={styles.stepSub}>14 days free. Cancel anytime.</p>

              {annualEnabled && (
                <div style={{ display: 'flex', gap: '0.75rem', margin: '0 0 1.25rem' }}>
                  {[
                    { key: 'monthly', title: '$9.99/mo', sub: 'Billed monthly' },
                    { key: 'annual', title: '$99/yr', sub: '2 months free' },
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPlan(p.key)}
                      style={{
                        flex: 1, padding: '0.9rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                        border: plan === p.key ? '2px solid #1a1a1a' : '1px solid #ddd',
                        background: plan === p.key ? '#f7f4ee' : '#fff',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.title}</div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>{p.sub}</div>
                    </button>
                  ))}
                </div>
              )}

              {ref && (
                <p style={{ background: '#dcfce7', color: '#166534', padding: '0.5rem 0.9rem', borderRadius: 6, fontSize: '0.85rem' }}>
                  🎁 Referred by a friend — you're helping them earn a free month!
                </p>
              )}

              <div className={styles.reviewSection}>
                <div className={styles.reviewLabel}>Email</div>
                <div>{form.email}</div>
              </div>
              <div className={styles.reviewSection}>
                <div className={styles.reviewLabel}>Niche</div>
                <div>{form.niche}</div>
              </div>
              <div className={styles.reviewSection}>
                <div className={styles.reviewLabel}>Watchlist ({watchlist.length} items)</div>
                {watchlist.map((w, i) => (
                  <div key={i} className={styles.reviewItem}>
                    <strong>{w.label}</strong>
                    <span style={{ color: '#888', fontSize: '0.85rem', display: 'block' }}>Keywords: {w.keywords}</span>
                  </div>
                ))}
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', fontSize: '1.05rem' }} onClick={submit} disabled={loading}>
                {loading ? 'Redirecting to checkout…' : 'Start 14-day free trial →'}
              </button>
              <div className={styles.stepNav} style={{ marginTop: '0.75rem' }}>
                <button className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
