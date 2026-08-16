import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Success.module.css'

const REASONS = [
  'Too expensive',
  "Didn't track the items I wanted",
  'Not using it enough',
  'Found a better alternative',
  'Just needed it temporarily',
  'Other',
]

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [status, setStatus] = useState('prompt') // prompt | feedback | loading | done | error
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [otherText, setOtherText] = useState('')

  function goToFeedback() {
    setStatus('feedback')
  }

  async function confirm() {
    if (!id) { setError('Missing subscriber ID'); return }
    setStatus('loading')
    try {
      const API = import.meta.env.VITE_API_URL || ''
      const finalReason = reason === 'Other' ? (otherText.trim() || 'Other') : reason
      const res = await fetch(`${API}/api/subscribers/${id}/unsubscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to unsubscribe')
      setStatus('done')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === 'prompt' && (
          <>
            <div className={styles.icon}>💌</div>
            <h2 className={styles.title}>Unsubscribe from CollectrBrief?</h2>
            <p className={styles.body}>You'll stop receiving your weekly market brief. Your Stripe subscription will also be cancelled.</p>
            <button className="btn btn-primary" style={{ background: '#dc2626', marginTop: '1rem' }} onClick={goToFeedback}>
              Yes, unsubscribe me
            </button>
            <div style={{ marginTop: '0.75rem' }}>
              <a href="/" style={{ color: '#888', fontSize: '0.9rem' }}>Actually, keep my subscription →</a>
            </div>
          </>
        )}

        {status === 'feedback' && (
          <>
            <h2 className={styles.title}>Before you go — why are you leaving?</h2>
            <p className={styles.body} style={{ marginBottom: '1rem' }}>Totally optional, but it helps us improve. One click.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', marginBottom: '1rem' }}>
              {REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
            {reason === 'Other' && (
              <textarea
                placeholder="Tell us more (optional)"
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }}
              />
            )}
            <button className="btn btn-primary" style={{ background: '#dc2626', width: '100%' }} onClick={confirm}>
              Confirm unsubscribe
            </button>
            <div style={{ marginTop: '0.75rem' }}>
              <a href="/" style={{ color: '#888', fontSize: '0.9rem' }}>Actually, keep my subscription →</a>
            </div>
          </>
        )}

        {status === 'loading' && <p className={styles.body}>Processing…</p>}
        {status === 'done' && (
          <>
            <div className={styles.icon}>✓</div>
            <h2 className={styles.title}>You've been unsubscribed</h2>
            <p className={styles.body}>No more briefs. Your subscription has been cancelled.</p>
            <a href="/" className={styles.homeLink}>← Back to home</a>
          </>
        )}
        {status === 'error' && <p style={{ color: '#dc2626' }}>{error}</p>}
      </div>
    </div>
  )
}
