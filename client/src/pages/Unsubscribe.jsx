import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Success.module.css'

export default function Unsubscribe() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const [status, setStatus] = useState('prompt') // prompt | loading | done | error
  const [error, setError] = useState('')

  async function confirm() {
    if (!id) { setError('Missing subscriber ID'); return }
    setStatus('loading')
    try {
      const API = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API}/api/subscribers/${id}/unsubscribe`, { method: 'DELETE' })
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
            <button className="btn btn-primary" style={{ background: '#dc2626', marginTop: '1rem' }} onClick={confirm}>
              Yes, unsubscribe me
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
