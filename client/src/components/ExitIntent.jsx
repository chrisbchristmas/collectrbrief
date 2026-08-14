import { useEffect, useState, useRef } from 'react'
import styles from './ExitIntent.module.css'

const API = import.meta.env.VITE_API_URL || 'https://collectrbrief-api.onrender.com'

/**
 * Fires once per session when the mouse leaves the top of the viewport
 * (classic "about to close the tab" signal) while on /subscribe.
 * Offers the free sample brief instead of losing the visitor cold.
 */
export default function ExitIntent() {
  const [visible, setVisible] = useState(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (sessionStorage.getItem('cb_exit_intent_shown')) {
      firedRef.current = true
    }

    function handleMouseLeave(e) {
      if (firedRef.current) return
      if (e.clientY <= 0) {
        firedRef.current = true
        sessionStorage.setItem('cb_exit_intent_shown', '1')
        setVisible(true)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [])

  if (!visible) return null

  return (
    <div className={styles.overlay} onClick={() => setVisible(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={() => setVisible(false)}>✕</button>
        <p className={styles.eyebrow}>Before you go</p>
        <h3 className={styles.title}>Not ready to commit?</h3>
        <p className={styles.body}>
          See a real CollectrBrief first — no email, no signup. Just a live example of what
          lands in your inbox every Sunday.
        </p>
        <a
          href={`${API}/sample`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ display: 'block', textAlign: 'center', width: '100%', textDecoration: 'none' }}
          onClick={() => setVisible(false)}
        >
          See the free sample brief →
        </a>
        <button className={styles.dismiss} onClick={() => setVisible(false)}>No thanks, continue</button>
      </div>
    </div>
  )
}
