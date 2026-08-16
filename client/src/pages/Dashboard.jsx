import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import styles from './Onboarding.module.css'

const NICHES = [
  'Sports Cards', 'Pokémon', 'Vintage Comics', 'Coins & Currency',
  'Magic: The Gathering', 'Vintage Toys', 'Video Games', 'Sports Memorabilia', 'Other'
]

const API = import.meta.env.VITE_API_URL || ''

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function weekLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function authHeaders(token) {
  return { 'x-pref-token': token, 'Content-Type': 'application/json' }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', padding: '24px', marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 18px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#888' }}>{title}</h2>
      {children}
    </div>
  )
}

// ─── Portfolio snapshot ───────────────────────────────────────────────────────

function PortfolioBlock({ history }) {
  const latest = history?.[0]
  const metrics = latest?.metrics
  if (!metrics) return <p style={{ color: '#999', fontSize: 14 }}>No brief data yet — your first brief arrives Sunday.</p>

  const pf = metrics.portfolio
  const wowPct = metrics.wowPct

  // Engagement streak: consecutive sent briefs counting back from the most recent.
  // Pure computed stat from brief history already fetched — no new data needed.
  const streak = (() => {
    let count = 0
    for (const brief of history) {
      if (brief.sent_at) count++
      else break
    }
    return count
  })()

  return (
    <div>
      {streak >= 2 && (
        <div style={{
          background: '#fef3c7', borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          textAlign: 'center', fontSize: 13, color: '#92400e', fontWeight: 600,
        }}>
          🔥 {streak}-week streak — you've tracked your collection {streak} weeks running
        </div>
      )}
      {typeof wowPct === 'number' && (
        <div style={{
          background: wowPct >= 0 ? '#dcfce7' : '#fee2e2',
          borderRadius: 8, padding: '14px 20px', marginBottom: 16, textAlign: 'center'
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: wowPct >= 0 ? '#166534' : '#991b1b' }}>
            Watchlist {wowPct >= 0 ? '+' : ''}{wowPct}% this week
          </span>
          <span style={{ display: 'block', color: '#666', fontSize: 13, marginTop: 2 }}>
            Combined avg ${fmt(metrics.avgTotal)} vs ${fmt(metrics.prevAvgTotal)} last week
          </span>
        </div>
      )}
      {pf && (
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '20px 24px', color: '#e8e4dc' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8 }}>
            Your portfolio ({pf.items} tracked item{pf.items === 1 ? '' : 's'})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr><td>You paid</td><td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(pf.paid)}</td></tr>
              <tr><td>Market value now</td><td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(pf.now)}</td></tr>
              <tr>
                <td style={{ paddingTop: 6, borderTop: '1px solid #333' }}>Gain / loss</td>
                <td style={{ paddingTop: 6, borderTop: '1px solid #333', textAlign: 'right', fontWeight: 700, color: pf.gain >= 0 ? '#4ade80' : '#f87171' }}>
                  {pf.gain >= 0 ? '+' : ''}${fmt(pf.gain)} ({pf.gainPct >= 0 ? '+' : ''}{pf.gainPct}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {!pf && (
        <p style={{ color: '#999', fontSize: 13, margin: 0 }}>
          Add a "What you paid" price on any watchlist item in <a href={`/preferences?id=${new URLSearchParams(window.location.search).get('id')}&token=${new URLSearchParams(window.location.search).get('token')}`} style={{ color: '#1a1a1a' }}>Preferences</a> to unlock portfolio tracking.
        </p>
      )}
    </div>
  )
}

// ─── Trend charts ─────────────────────────────────────────────────────────────

function TrendCharts({ history }) {
  if (!history?.length) return <p style={{ color: '#999', fontSize: 14 }}>No history yet — charts populate after your first brief.</p>

  // Build per-item series: [{ week, Label1: avg, Label2: avg, ... }]
  const allLabels = [...new Set(history.flatMap(b => b.items.map(i => i.label)))]
  const weeks = [...history].reverse() // oldest → newest

  const chartData = weeks.map(brief => {
    const point = { week: weekLabel(brief.week_of) }
    for (const item of brief.items) {
      if (item.avg > 0) point[item.label] = item.avg
    }
    return point
  })

  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#be185d']

  if (allLabels.length === 0) return <p style={{ color: '#999', fontSize: 14 }}>No price data recorded yet.</p>

  return (
    <div>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Market average per week for your watchlist items, last {weeks.length} week{weeks.length === 1 ? '' : 's'}.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} width={52} />
          <Tooltip formatter={(v, name) => [`$${fmt(v)}`, name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {allLabels.map((label, i) => (
            <Line key={label} type="monotone" dataKey={label} stroke={COLORS[i % COLORS.length]}
              strokeWidth={2} dot={{ r: 3 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Brief archive ────────────────────────────────────────────────────────────

function BriefArchive({ history }) {
  if (!history?.length) return <p style={{ color: '#999', fontSize: 14 }}>No briefs sent yet.</p>

  return (
    <div>
      {history.map(brief => {
        const m = brief.metrics
        const wow = m?.wowPct
        return (
          <div key={brief.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Week of {weekLabel(brief.week_of)}</span>
              {typeof wow === 'number' && (
                <span style={{ marginLeft: 8, fontSize: 12, color: wow >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {wow >= 0 ? '▲' : '▼'} {Math.abs(wow)}%
                </span>
              )}
              <span style={{ marginLeft: 8, fontSize: 12, color: '#bbb' }}>
                {brief.items.length} item{brief.items.length === 1 ? '' : 's'}
              </span>
            </div>
            <a
              href={`${API}/b/${brief.id}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#555', textDecoration: 'none', border: '1px solid #ddd', padding: '4px 10px', borderRadius: 5 }}
            >
              View →
            </a>
          </div>
        )
      })}
    </div>
  )
}

// ─── Price alerts ─────────────────────────────────────────────────────────────

function PriceAlerts({ subscriberId, token, watchlist }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ label: '', keywords: '', direction: 'below', threshold: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/alerts/${subscriberId}?token=${encodeURIComponent(token)}`)
      if (r.ok) setAlerts(await r.json())
    } finally { setLoading(false) }
  }, [subscriberId, token])

  useEffect(() => { load() }, [load])

  // Pre-fill label/keywords when user picks a watchlist item
  function pickItem(label) {
    const item = watchlist.find(w => w.label === label)
    setForm(f => ({ ...f, label, keywords: item?.keywords || label }))
  }

  async function createAlert(e) {
    e.preventDefault()
    if (!form.label || !form.threshold) return
    setSaving(true); setError('')
    try {
      const r = await fetch(`${API}/api/alerts/${subscriberId}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ ...form, threshold: parseFloat(form.threshold) }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed')
      setAlerts(a => [data, ...a])
      setForm({ label: '', keywords: '', direction: 'below', threshold: '' })
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function dismiss(alertId) {
    await fetch(`${API}/api/alerts/${subscriberId}/${alertId}?token=${encodeURIComponent(token)}`, {
      method: 'DELETE', headers: authHeaders(token),
    })
    setAlerts(a => a.filter(x => x.id !== alertId))
  }

  if (loading) return <p style={{ color: '#999', fontSize: 14 }}>Loading alerts…</p>

  return (
    <div>
      {/* Existing alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9f6f1', borderRadius: 6, marginBottom: 6 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>
                  {a.direction === 'above' ? '📈 above' : '📉 below'} ${Number(a.threshold).toLocaleString()}
                </span>
                {a.triggered_at && <span style={{ color: '#ea580c', fontSize: 11, marginLeft: 6 }}>✓ triggered</span>}
              </div>
              <button onClick={() => dismiss(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 16, padding: '0 4px' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {alerts.length === 0 && <p style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>No active alerts. Set one below — we'll email you when it triggers.</p>}

      {/* New alert form */}
      <form onSubmit={createAlert} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 3 }}>Item</label>
            <select value={form.label} onChange={e => pickItem(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
              <option value="">Pick from watchlist…</option>
              {watchlist.map(w => <option key={w.label} value={w.label}>{w.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 3 }}>Alert when</label>
            <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
              <option value="below">drops below</option>
              <option value="above">rises above</option>
            </select>
          </div>
          <div style={{ flex: '0 0 110px' }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 3 }}>Price ($)</label>
            <input type="number" min="0" step="0.01" placeholder="e.g. 500"
              value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" disabled={saving || !form.label || !form.threshold}
              style={{ padding: '8px 18px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {saving ? '…' : 'Set alert'}
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
      </form>
    </div>
  )
}

// ─── Categories ───────────────────────────────────────────────────────────────

function CategorySelector({ subscriberId, token, currentCategories, onSaved }) {
  const [selected, setSelected] = useState(currentCategories || [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(niche) {
    setSelected(s => s.includes(niche) ? s.filter(n => n !== niche) : [...s, niche])
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await fetch(`${API}/api/subscribers/${subscriberId}?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ categories: selected }),
      })
      setSaved(true)
      onSaved(selected)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
        Pick which categories appear in your weekly brief. Leave all unchecked to include everything.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {NICHES.map(n => (
          <button key={n} onClick={() => toggle(n)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: selected.includes(n) ? 700 : 400,
              background: selected.includes(n) ? '#1a1a1a' : '#f9f6f1',
              color: selected.includes(n) ? '#fff' : '#555',
              border: selected.includes(n) ? '1px solid #1a1a1a' : '1px solid #ddd',
              transition: 'all 0.15s',
            }}>
            {n}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 12px' }}>All categories included.</p>
      )}
      <button onClick={save} disabled={saving}
        style={{ padding: '8px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save categories'}
      </button>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const token = params.get('token')

  const [status, setStatus] = useState('loading')
  const [subscriber, setSubscriber] = useState(null)
  const [history, setHistory] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!id || !token) { setStatus('denied'); return }

    Promise.all([
      fetch(`${API}/api/subscribers/${id}?token=${encodeURIComponent(token)}`).then(r => r.json()),
      fetch(`${API}/api/subscribers/${id}/history?token=${encodeURIComponent(token)}`).then(r => r.ok ? r.json() : []),
    ])
      .then(([sub, hist]) => {
        if (sub.error) { setStatus('denied'); return }
        setSubscriber(sub)
        setHistory(hist || [])
        const cats = typeof sub.categories === 'string' ? JSON.parse(sub.categories) : (sub.categories || [])
        setCategories(cats)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id, token])

  const watchlist = subscriber
    ? (typeof subscriber.watchlist === 'string' ? JSON.parse(subscriber.watchlist) : (subscriber.watchlist || []))
    : []

  if (status === 'loading') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card"><p style={{ textAlign: 'center', color: '#888' }}>Loading your dashboard…</p></div></div>
    </div>
  )

  if (status === 'denied') return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div className={styles.wrapper}><div className="card">
        <h2 className={styles.stepTitle}>Link invalid or expired</h2>
        <p className={styles.stepSub}>Use the "My dashboard" link from your most recent brief email to access this page.</p>
      </div></div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}><a href="/" className={styles.logo}>CollectrBrief</a></div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 40px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#1a1a1a' }}>
              {subscriber?.first_name ? `${subscriber.first_name}'s Dashboard` : 'My Dashboard'}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{subscriber?.email}</p>
          </div>
          <a href={`/preferences?id=${id}&token=${token}`}
            style={{ fontSize: 13, color: '#555', textDecoration: 'none', border: '1px solid #ddd', padding: '6px 14px', borderRadius: 6 }}>
            Preferences ↗
          </a>
        </div>

        <Section title="Collection Value">
          <PortfolioBlock history={history} />
        </Section>

        <Section title="Price Trend Charts">
          <TrendCharts history={history} />
        </Section>

        <Section title="Price Alerts">
          <PriceAlerts subscriberId={id} token={token} watchlist={watchlist} />
        </Section>

        <Section title="Brief Archive">
          <BriefArchive history={history} />
        </Section>

        <Section title="My Categories">
          <CategorySelector
            subscriberId={id} token={token}
            currentCategories={categories}
            onSaved={setCategories}
          />
        </Section>

      </div>
    </div>
  )
}
