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

    // 2. Generate LLM commentary
    const commentary = await generateCommentary(subscriber, itemResults);

    // 3. Render HTML email
    const html = renderBriefEmail(subscriber, itemResults, commentary, weekOf);

    // 4. Persist
    await query(
      `UPDATE briefs SET status='generated', raw_data=$1, generated_html=$2, llm_commentary=$3
       WHERE id=$4`,
      [JSON.stringify({ items: itemResults }), html, commentary, briefId]
    );

    return { briefId, html, itemResults, commentary };
  } catch (err) {
    await query(
      `UPDATE briefs SET status='failed', error_message=$1 WHERE id=$2`,
      [err.message, briefId]
    );
    throw err;
  }
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

function renderBriefEmail(subscriber, itemResults, commentary, weekOf) {
  const weekLabel = new Date(weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const clientOrigin = process.env.CLIENT_ORIGIN || 'https://collectrbrief.com';
  const unsubUrl = `${clientOrigin}/unsubscribe?id=${subscriber.id}`;
  const prefsUrl = `${clientOrigin}/preferences?id=${subscriber.id}&token=${signToken(subscriber.id)}`;

  const trendIcon = { up: '📈', down: '📉', stable: '➡️' };

  const itemRows = itemResults.map(item => {
    const icon = trendIcon[item.trend.trend] || '❓';
    const topSales = item.sales.slice(0, 5);
    return `
      <tr>
        <td style="padding:20px 0;border-bottom:1px solid #eee">
          <h3 style="margin:0 0 8px;font-size:18px;color:#1a1a1a">${icon} ${escapeHtml(item.label)}</h3>
          <p style="margin:0 0 8px;color:#666;font-size:14px">
            ${item.trend.count} sales · avg <strong>$${item.trend.avg}</strong> · range $${item.trend.min}–$${item.trend.max} · trend: <strong style="color:${trendColor(item.trend.trend)}">${item.trend.trend}</strong>
          </p>
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
    ? commentary.split(/\n\n+/).map(p => `<p style="color:#333;line-height:1.7;font-size:15px">${escapeHtml(p)}</p>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your CollectrBrief — Week of ${weekLabel}</title></head>
<body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif">
<div style="max-width:620px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    <p style="color:#888;font-size:13px;margin:4px 0">Week of ${weekLabel}</p>
    ${subscriber.first_name ? `<p style="color:#555;font-size:14px;margin:4px 0">Your personalized brief, ${escapeHtml(subscriber.first_name)}</p>` : ''}
  </div>

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

  <!-- Footer -->
  <div style="text-align:center;color:#bbb;font-size:12px;padding:16px 0">
    <p>You're receiving this because you subscribed to CollectrBrief.</p>
    <p><a href="${unsubUrl}" style="color:#bbb">Unsubscribe</a> · <a href="${prefsUrl}" style="color:#bbb">Manage preferences</a></p>
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
