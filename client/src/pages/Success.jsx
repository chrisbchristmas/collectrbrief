import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from './Success.module.css'

export default function Success() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    // Small delay so Stripe webhook has time to fire
    const t = setTimeout(() => setStatus('ready'), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🎉</div>
        {status === 'loading' ? (
          <h2 className={styles.title}>Setting up your brief…</h2>
        ) : (
          <>
            <h2 className={styles.title}>You're in!</h2>
            <p className={styles.body}>
              Your first CollectrBrief lands this Sunday morning. We'll track your watchlist across
              eBay, Heritage, and Fanatics and deliver your personalized market take.
            </p>
            <p className={styles.body}>Check your inbox for a welcome note.</p>
            <a href="/" className={styles.homeLink}>← Back to home</a>
          </>
        )}
      </div>
    </div>
  )
}
