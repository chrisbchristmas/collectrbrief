import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || ''

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('cb_admin_key') || '')
  const [authed, setAuthed] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [busy, setBusy] = useState('')
  const [triggerResult, setTriggerResult] = useState(null)

  const hdrs = useCallback(() => ({ 'x-admin-key': adminKey }), [adminKey])

  async function load() {
    setError('')
    try {
      const [sRes, subRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`, { headers: hdrs() }),
        fetch(`${API}/api/admin/subscribers`, { headers: hdrs() }),
      ])
      if (sRes.status === 403) { setAuthed(false); setError('Invalid admin key'); return }
      if (!sRes.ok || !subRes.ok) throw new Error('Failed to load dashboard data')
      setStats(await sRes.json())
      setSubscribers(await subRes.json())
      setAuthed(true)
      sessionStorage.setItem('cb_admin_key', adminKey)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { if (adminKey && !authed) load() }, []) // auto-login if key in session

  async function triggerBrief(subscriberId) {
    setBusy(subscriberId || 'all')
    setTriggerResult(null)
    try {
      const res = await fetch(`${API}/api/admin/trigger-brief`, {
        method: 'POST',
        headers: { ...hdrs(), 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriberId ? { subscriber_id: subscriberId } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Trigger failed')
      setTriggerResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function previewBrief(subscriberId) {
    // Admin key can't go in a normal <a> header — open via fetch + blob
    setBusy('preview-' + subscriberId)
    fetch(`${API}/api/admin/preview-brief/${subscriberId}`, { headers: hdrs() })
      .then(async res => {
        if (!res.ok) throw new Error((await res.json()).error || 'Preview failed')
        return res.text()
      })
      .then(html => {
        const blob = new Blob([html], { type: 'text/html' })
        window.open(URL.createObjectURL(blob), '_blank')
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(''))
  }

  async function copyMagicLink(subscriberId) {
    try {
      const res = await fetch(`${API}/api/admin/magic-link/${subscriberId}`, { headers: hdrs() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      await navigator.clipboard.writeText(data.url)
      setError('')
      setTriggerResult({ copied: data.url })
    } catch (err) {
      setError(err.message)
    }
  }

  const S = {
    page: { minHeight: '100vh', background: '#f9f6f1', fontFamily: 'Georgia, serif', padding: '2rem 1rem' },
    wrap: { maxWidth: 960, margin: '0 auto' },
    logo: { fontSize: '1.6rem', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' },
    card: { background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '1.5rem', marginTop: '1.25rem' },
    h2: { margin: '0 0 1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1, color: '#888' },
    input: { width: '100%', padding: '0.7rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' },
    btn: { background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem 1.2rem', fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' },
    btnSm: { background: '#f1ede6', color: '#1a1a1a', border: '1px solid #ddd', borderRadius: 5, padding: '0.3rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer', marginRight: '0.4rem', fontFamily: 'inherit' },
    statNum: { fontSize: '2rem', fontWeight: 700, color: '#1a1a1a' },
    statLabel: { color: '#888', fontSize: '0.85rem' },
    th: { textAlign: 'left', padding: '0.5rem 0.6rem', borderBottom: '2px solid #eee', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 0.5 },
    td: { padding: '0.6rem', borderBottom: '1px solid #f1ede6', fontSize: '0.9rem', verticalAlign: 'top' },
    err: { color: '#dc2626', marginTop: '0.75rem' },
    badge: (s) => ({
      display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.75rem',
      background: s === 'active' ? '#dcfce7' : s === 'trialing' ? '#dbeafe' : '#fee2e2',
      color: s === 'active' ? '#166534' : s === 'trialing' ? '#1e40af' : '#991b1b',
    }),
  }

  if (!authed) {
    return (
      <div style={S.page}>
        <div style={{ ...S.wrap, maxWidth: 420 }}>
          <a href="/" style={S.logo}>CollectrBrief</a>
          <div style={S.card}>
            <h2 style={S.h2}>Admin access</h2>
            <input
              style={S.input}
              type="password"
              placeholder="Admin key"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            <button style={{ ...S.btn, width: '100%', marginTop: '0.75rem' }} onClick={load} disabled={!adminKey}>
              Sign in
            </button>
            {error && <p style={S.err}>{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  const statusCounts = Object.fromEntries((stats?.subscribers || []).map(r => [r.subscription_status, Number(r.count)]))
  const briefCounts = Object.fromEntries((stats?.briefs_this_week || []).map(r => [r.status, Number(r.count)]))

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <a href="/" style={S.logo}>CollectrBrief <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 400 }}>admin</span></a>
          <div>
            <button style={S.btnSm} onClick={load}>↻ Refresh</button>
            <button style={S.btnSm} onClick={() => { sessionStorage.removeItem('cb_admin_key'); setAuthed(false); setAdminKey('') }}>Sign out</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          {[
            ['Active', statusCounts.active || 0],
            ['Trialing', statusCounts.trialing || 0],
            ['Pending', statusCounts.pending || 0],
            ['Briefs sent (7d)', briefCounts.sent || 0],
            ['Briefs failed (7d)', briefCounts.failed || 0],
          ].map(([label, num]) => (
            <div key={label} style={{ ...S.card, marginTop: 0, textAlign: 'center' }}>
              <div style={S.statNum}>{num}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={S.card}>
          <h2 style={S.h2}>Actions</h2>
          <button style={S.btn} onClick={() => triggerBrief(null)} disabled={!!busy}>
            {busy === 'all' ? 'Sending…' : 'Send briefs to all active subscribers'}
          </button>
          {error && <p style={S.err}>{error}</p>}
          {triggerResult?.copied && (
            <p style={{ color: '#166534', marginTop: '0.75rem', fontSize: '0.85rem', wordBreak: 'break-all' }}>
              ✓ Magic link copied: {triggerResult.copied}
            </p>
          )}
          {triggerResult?.results && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              {triggerResult.results.map((r, i) => (
                <div key={i} style={{ color: r.status === 'sent' ? '#166534' : '#dc2626' }}>
                  {r.status === 'sent' ? '✓' : '✕'} {r.email} {r.error ? `— ${r.error}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribers */}
        <div style={S.card}>
          <h2 style={S.h2}>Subscribers ({subscribers.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Niche</th>
                  <th style={S.th}>Items</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Joined</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(sub => {
                  const wl = typeof sub.watchlist === 'string' ? JSON.parse(sub.watchlist) : (sub.watchlist || [])
                  return (
                    <tr key={sub.id}>
                      <td style={S.td}>{sub.email}{sub.first_name ? <div style={{ color: '#999', fontSize: '0.8rem' }}>{sub.first_name}</div> : null}</td>
                      <td style={S.td}>{sub.niche}</td>
                      <td style={S.td}>{wl.length}</td>
                      <td style={S.td}><span style={S.badge(sub.subscription_status)}>{sub.subscription_status}</span></td>
                      <td style={S.td}>{new Date(sub.created_at).toLocaleDateString()}</td>
                      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                        <button style={S.btnSm} onClick={() => previewBrief(sub.id)} disabled={!!busy}>
                          {busy === 'preview-' + sub.id ? '…' : 'Preview'}
                        </button>
                        <button style={S.btnSm} onClick={() => triggerBrief(sub.id)} disabled={!!busy}>
                          {busy === sub.id ? '…' : 'Send now'}
                        </button>
                        <button style={S.btnSm} onClick={() => copyMagicLink(sub.id)}>
                          Prefs link
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
