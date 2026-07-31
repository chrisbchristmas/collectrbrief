// services/briefEngine.js — Orchestrates data fetch + LLM + email render
// Called by the weekly cron job and the /admin/trigger endpoint

import { fetchSoldSales, computeTrend } from './cardhedge.js';
import { searchProduct } from './pricecharting.js';
import { generateCommentary } from './llm.js';
import { query } from '../db/index.js';
import { signToken } from '../utils/token.js';

/**
 * Generate and persist a brief for a single subscriber.
 * Returns the brief row.
 */
export async function generateBriefForSubscriber(subscriber, weekOf) {
  const briefId = await createBriefRecord(subscriber.id, weekOf);

  try {
    // 1. Fetch price data for each watchlist item
    const itemResults = await fetchWatchlistData(subscriber.watchlist);

    // 2. Week-over-week metrics vs last week's brief + biggest mover + portfolio
    const metrics = await computeMetrics(subscriber, itemResults, weekOf);

    // 3. Generate LLM commentary
    const commentary = await generateCommentary(subscriber, itemResults);

    // 4. Render HTML email
    const html = renderBriefEmail(subscriber, itemResults, commentary, weekOf, metrics, briefId);

    // 5. Persist
    await query(
      `UPDATE briefs SET status='generated', raw_data=$1, generated_html=$2, llm_commentary=$3, metrics=$4
       WHERE id=$5`,
      [JSON.stringify({ items: itemResults }), html, commentary, JSON.stringify(metrics), briefId]
    );

    return { briefId, html, itemResults, commentary, metrics };
  } catch (err) {
    await query(
      `UPDATE briefs SET status='failed', error_message=$1 WHERE id=$2`,
      [err.message, briefId]
    );
    throw err;
  }
}

/**
 * Personalized subject line from metrics. Falls back to the generic date subject.
 * e.g. "📈 Your Charizard is up 12% this week" / "📉 Your watchlist slipped 3.4% this week"
 */
export function buildSubjectLine(metrics, weekOf) {
  const generic = `Your CollectrBrief — Week of ${weekLabel(weekOf)}`;
  if (!metrics) return generic;

  const m = metrics.mover;
  if (m && Math.abs(m.pct) >= 3) {
    const short = m.label.length > 30 ? m.label.slice(0, 30).trim() + '…' : m.label;
    return m.pct > 0
      ? `📈 Your ${short} is up ${Math.abs(m.pct)}% this week`
      : `📉 Your ${short} is down ${Math.abs(m.pct)}% this week`;
  }
  if (typeof metrics.wowPct === 'number' && Math.abs(metrics.wowPct) >= 1) {
    return metrics.wowPct > 0
      ? `📈 Your watchlist is up ${Math.abs(metrics.wowPct)}% this week`
      : `📉 Your watchlist slipped ${Math.abs(metrics.wowPct)}% this week`;
  }
  return generic;
}

/**
 * Compare this week's averages against last week's brief for the same subscriber.
 * Also computes the biggest mover and portfolio gain/loss (if purchase_price set).
 */
async function computeMetrics(subscriber, itemResults, weekOf) {
  const metrics = { avgTotal: 0, prevAvgTotal: null, wowPct: null, mover: null, portfolio: null, perItem: {} };

  const valid = itemResults.filter(i => i.trend && i.trend.count > 0);
  metrics.avgTotal = round2(valid.reduce((s, i) => s + i.trend.avg, 0));

  // Fetch last week's raw_data
  try {
    const prev = await query(
      `SELECT raw_data FROM briefs
       WHERE subscriber_id=$1 AND week_of < $2 AND raw_data IS NOT NULL
       ORDER BY week_of DESC LIMIT 1`,
      [subscriber.id, weekOf]
    );
    if (prev.rows.length > 0) {
      const prevItems = (prev.rows[0].raw_data?.items || []).filter(i => i.trend && i.trend.count > 0);
      const prevByLabel = Object.fromEntries(prevItems.map(i => [i.label, i.trend.avg]));

      let movers = [];
      for (const item of valid) {
        const prevAvg = prevByLabel[item.label];
        if (prevAvg > 0) {
          const pct = round1(((item.trend.avg - prevAvg) / prevAvg) * 100);
          metrics.perItem[item.label] = { prevAvg: round2(prevAvg), pct };
          movers.push({ label: item.label, pct, dir: pct >= 0 ? 'up' : 'down' });
        }
      }
      if (movers.length) {
        movers.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
        metrics.mover = movers[0];
      }

      const prevTotal = prevItems.reduce((s, i) => s + i.trend.avg, 0);
      if (prevTotal > 0) {
        metrics.prevAvgTotal = round2(prevTotal);
        metrics.wowPct = round1(((metrics.avgTotal - prevTotal) / prevTotal) * 100);
      }
    }
  } catch (err) {
    console.warn('[Metrics] WoW computation failed:', err.message);
  }

  // Portfolio gain/loss from purchase_price on watchlist items
  const watchlist = Array.isArray(subscriber.watchlist) ? subscriber.watchlist : [];
  const priced = watchlist.filter(w => Number(w.purchase_price) > 0);
  if (priced.length) {
    let paid = 0, now = 0, tracked = 0;
    for (const w of priced) {
      const item = valid.find(i => i.label === (w.label || w.keywords));
      if (item) {
        paid += Number(w.purchase_price);
        now += item.trend.avg;
        tracked++;
      }
    }
    if (tracked > 0 && paid > 0) {
      metrics.portfolio = {
        paid: round2(paid),
        now: round2(now),
        gain: round2(now - paid),
        gainPct: round1(((now - paid) / paid) * 100),
        items: tracked,
      };
    }
  }

  return metrics;
}

async function createBriefRecord(subscriberId, weekOf) {
  const res = await query(
    `INSERT INTO briefs (subscriber_id, week_of) VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [subscriberId, weekOf]
  );
  if (res.rows.length === 0) {
    // Already exists — fetch it
    const existing = await query(
      `SELECT id FROM briefs WHERE subscriber_id=$1 AND week_of=$2`,
      [subscriberId, weekOf]
    );
    return existing.rows[0].id;
  }
  return res.rows[0].id;
}

async function fetchWatchlistData(watchlist) {
  const items = Array.isArray(watchlist) ? watchlist : [];

  const results = await Promise.allSettled(
    items.map(async (item) => {
      const keywords = item.keywords || item.label || '';

      // Parallel: CardHedge sold sales + PriceCharting lookup
      const [salesResult, pcResult] = await Promise.allSettled([
        fetchSoldSales(keywords, { limit: 20, daysBack: 7 }),
        searchProduct(keywords),
      ]);

      const sales = salesResult.status === 'fulfilled' ? salesResult.value : [];
      const pcData = pcResult.status === 'fulfilled' ? pcResult.value : null;
      const trend = computeTrend(sales);

      return {
        label: item.label || keywords,
        keywords,
        sales,
        trend,
        pcData,
      };
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { label: items[i]?.label || 'Unknown', keywords: '', sales: [], trend: { trend: 'error', avg: 0, min: 0, max: 0, count: 0 }, pcData: null, error: r.reason?.message }
  );
}

function renderBriefEmail(subscriber, itemResults, commentary, weekOf, metrics = null, briefId = null) {
  const wLabel = weekLabel(weekOf);
  const clientOrigin = process.env.CLIENT_ORIGIN || 'https://collectrbrief.com';
  const apiOrigin = process.env.API_ORIGIN || 'https://collectrbrief-api.onrender.com';
  const unsubUrl = `${clientOrigin}/unsubscribe?id=${subscriber.id}`;
  const prefsUrl = `${clientOrigin}/preferences?id=${subscriber.id}&token=${signToken(subscriber.id)}`;
  const shareUrl = briefId ? `${apiOrigin}/b/${briefId}?t=${signToken(briefId)}` : null;
  const refUrl = `${clientOrigin}/subscribe?ref=${subscriber.id}`;

  const trendIcon = { up: '📈', down: '📉', stable: '➡️' };

  // Watchlist items keyed by label for purchase price lookup
  const watchlist = Array.isArray(subscriber.watchlist) ? subscriber.watchlist : [];
  const paidByLabel = Object.fromEntries(
    watchlist.filter(w => Number(w.purchase_price) > 0).map(w => [w.label || w.keywords, Number(w.purchase_price)])
  );

  // --- Headline: WoW summary ---
  const wowBanner = (metrics && typeof metrics.wowPct === 'number') ? `
  <div style="background:${metrics.wowPct >= 0 ? '#dcfce7' : '#fee2e2'};border-radius:8px;padding:14px 20px;margin-bottom:20px;text-align:center">
    <span style="font-size:17px;font-weight:700;color:${metrics.wowPct >= 0 ? '#166534' : '#991b1b'}">
      Your watchlist: ${metrics.wowPct >= 0 ? '+' : ''}${metrics.wowPct}% this week
    </span>
    <span style="display:block;color:#666;font-size:13px;margin-top:2px">Combined avg $${metrics.avgTotal.toLocaleString()} vs $${metrics.prevAvgTotal.toLocaleString()} last week</span>
  </div>` : '';

  // --- Spotlight: biggest mover ---
  const mover = metrics?.mover;
  const spotlight = (mover && Math.abs(mover.pct) >= 1) ? `
  <div style="background:#fff;border-left:4px solid ${mover.pct >= 0 ? '#16a34a' : '#dc2626'};border-radius:8px;padding:18px 20px;margin-bottom:24px;border-top:1px solid #eee;border-right:1px solid #eee;border-bottom:1px solid #eee">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px">Biggest mover</div>
    <div style="font-size:18px;font-weight:700;color:#1a1a1a">${mover.pct >= 0 ? '📈' : '📉'} ${escapeHtml(mover.label)}</div>
    <div style="color:${mover.pct >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;font-size:15px;margin-top:2px">${mover.pct >= 0 ? '+' : ''}${mover.pct}% week over week</div>
  </div>` : '';

  // --- Portfolio summary ---
  const pf = metrics?.portfolio;
  const portfolioBlock = pf ? `
  <div style="background:#1a1a1a;border-radius:8px;padding:20px 24px;margin-bottom:24px">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:8px">Your portfolio (${pf.items} tracked item${pf.items === 1 ? '' : 's'})</div>
    <table style="width:100%;border-collapse:collapse;color:#e8e4dc;font-size:14px">
      <tr>
        <td>You paid</td><td style="text-align:right;font-weight:600">$${pf.paid.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Market value now</td><td style="text-align:right;font-weight:600">$${pf.now.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding-top:6px;border-top:1px solid #333">Gain / loss</td>
        <td style="text-align:right;padding-top:6px;border-top:1px solid #333;font-weight:700;color:${pf.gain >= 0 ? '#4ade80' : '#f87171'}">
          ${pf.gain >= 0 ? '+' : ''}$${pf.gain.toLocaleString()} (${pf.gainPct >= 0 ? '+' : ''}${pf.gainPct}%)
        </td>
      </tr>
    </table>
  </div>` : '';

  const itemRows = itemResults.map(item => {
    const icon = trendIcon[item.trend.trend] || '❓';
    const topSales = item.sales.slice(0, 5);
    const wow = metrics?.perItem?.[item.label];
    const paid = paidByLabel[item.label];
    return `
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #eee">
          <h3 style="margin:0 0 8px;font-size:18px;color:#1a1a1a">${icon} ${escapeHtml(item.label)}</h3>
          <p style="margin:0 0 8px;color:#666;font-size:14px">
            ${item.trend.count} sales · avg <strong>$${item.trend.avg}</strong> · range $${item.trend.min}–$${item.trend.max} · trend: <strong style="color:${trendColor(item.trend.trend)}">${item.trend.trend}</strong>
            ${wow ? ` · WoW: <strong style="color:${wow.pct >= 0 ? '#16a34a' : '#dc2626'}">${wow.pct >= 0 ? '+' : ''}${wow.pct}%</strong>` : ''}
          </p>
          ${paid && item.trend.avg > 0 ? `<p style="margin:0 0 8px;font-size:13px;color:${item.trend.avg >= paid ? '#16a34a' : '#dc2626'}">You paid $${paid.toLocaleString()} — ${item.trend.avg >= paid ? 'up' : 'down'} ${Math.abs(round1(((item.trend.avg - paid) / paid) * 100))}% (${item.trend.avg >= paid ? '+' : '−'}$${Math.abs(round2(item.trend.avg - paid)).toLocaleString()})</p>` : ''}
          ${item.pcData ? `<p style="margin:0 0 8px;color:#888;font-size:13px">PriceCharting: ungraded $${item.pcData.prices.ungraded || '—'} · graded $${item.pcData.prices.graded || '—'}</p>` : ''}
          ${topSales.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#555;margin-top:8px">
            ${topSales.map(s => `
            <tr>
              <td style="padding:3px 0">${escapeHtml(s.title.slice(0, 55))}${s.title.length > 55 ? '…' : ''}</td>
              <td style="text-align:right;color:#222;font-weight:600">$${s.price}</td>
              <td style="text-align:right;color:#999;padding-left:12px">${s.source}</td>
            </tr>`).join('')}
          </table>` : '<p style="color:#999;font-size:13px;margin:4px 0">No sales data available this week.</p>'}
        </td>
      </tr>`;
  }).join('');

  // Commentary is LLM output — convert newlines to <p> tags
  const commentaryHtml = commentary
    ? commentary.split(/\n\n+/).map(p => `<p style="color:#e8e4dc;line-height:1.7;font-size:15px">${escapeHtml(p)}</p>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your CollectrBrief — Week of ${wLabel}</title></head>
<body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif">
<div style="max-width:620px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    <p style="color:#888;font-size:13px;margin:4px 0">Week of ${wLabel}</p>
    ${subscriber.first_name ? `<p style="color:#555;font-size:14px;margin:4px 0">Your personalized brief, ${escapeHtml(subscriber.first_name)}</p>` : ''}
    ${shareUrl ? `<p style="margin:6px 0 0"><a href="${shareUrl}" style="color:#999;font-size:12px">View in browser / share →</a></p>` : ''}
  </div>

  ${wowBanner}
  ${spotlight}
  ${portfolioBlock}

  <!-- Price Data -->
  <div style="background:#fff;border-radius:8px;padding:24px;margin-bottom:24px;border:1px solid #eee">
    <h2 style="margin:0 0 16px;font-size:16px;text-transform:uppercase;letter-spacing:1px;color:#888">This Week's Sales</h2>
    <table style="width:100%;border-collapse:collapse">${itemRows}</table>
  </div>

  <!-- AI Commentary -->
  ${commentaryHtml ? `
  <div style="background:#1a1a1a;border-radius:8px;padding:24px;margin-bottom:24px">
    <h2 style="margin:0 0 16px;font-size:16px;text-transform:uppercase;letter-spacing:1px;color:#aaa">Market Take</h2>
    <div style="color:#e8e4dc">${commentaryHtml}</div>
  </div>` : ''}

  <!-- Referral -->
  <div style="background:#fff;border:1px dashed #ccc;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
    <p style="margin:0;color:#555;font-size:14px">Know a collector who'd love this?</p>
    <p style="margin:6px 0 0"><a href="${refUrl}" style="color:#1a1a1a;font-weight:700;font-size:14px">Give a friend a month free — get a month free →</a></p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:#bbb;font-size:12px;padding:16px 0">
    <p>You're receiving this because you subscribed to CollectrBrief.</p>
    <p><a href="${unsubUrl}" style="color:#bbb">Unsubscribe</a> · <a href="${prefsUrl}" style="color:#bbb">Manage preferences</a>${shareUrl ? ` · <a href="${shareUrl}" style="color:#bbb">View in browser</a>` : ''}</p>
    <p>CollectrBrief · Personalized market intelligence for collectors</p>
  </div>

</div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trendColor(trend) {
  if (trend === 'up') return '#16a34a';
  if (trend === 'down') return '#dc2626';
  return '#6b7280';
}

function weekLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
