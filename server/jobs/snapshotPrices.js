// jobs/snapshotPrices.js — Daily price history warmer.
//
// The Card API free tier only looks back 3 days, so a single Sunday fetch can
// never see a full week. This job fetches every tracked keyword once a day and
// fetchSoldSales() persists the result to price_snapshots. Over time that gives:
//   - a genuine 7-day window for the Sunday brief
//   - a prior-week window for true week-over-week % change
//   - a public sample/trending page that never shows "0 sales · avg $0"
//
// Budget: free tier is 5,000 records/day. Each keyword fetch returns <=50
// records, so ~100 keywords/day is the safe ceiling; the job caps itself there.

import cron from 'node-cron';
import { query } from '../db/index.js';
import { fetchSoldSales } from '../services/cardhedge.js';
import { SAMPLE_SUBSCRIBER, MARKET_NICHES } from '../services/publicContent.js';

const MAX_KEYWORDS_PER_RUN = 100;
const RECORDS_PER_FETCH = 40;
const DELAY_MS = 400; // be polite to the API

export function scheduleSnapshotJob() {
  // 3am server time daily — well clear of the 8am Sunday brief and 10am nudges
  cron.schedule('0 3 * * *', () => {
    console.log('[Snapshot] Daily run starting...');
    runSnapshotJob().catch(err => console.error('[Snapshot] Fatal error:', err));
  });
  console.log('[Snapshot] Scheduled: daily at 3:00am');
}

export async function collectTrackedKeywords() {
  const set = new Set();
  const add = k => { const n = String(k || '').trim(); if (n.length >= 3) set.add(n); };

  // Public pages first — they are what prospects see
  for (const item of SAMPLE_SUBSCRIBER.watchlist || []) add(item.keywords || item.label);
  for (const niche of MARKET_NICHES) for (const item of niche.items || []) add(item.keywords || item.label);

  // Then every active / trialing subscriber watchlist
  const r = await query(
    `SELECT watchlist FROM subscribers
     WHERE unsubscribed_at IS NULL AND subscription_status IN ('active', 'trialing')`
  );
  for (const row of r.rows) {
    const wl = Array.isArray(row.watchlist) ? row.watchlist : [];
    for (const item of wl) add(item.keywords || item.label);
  }

  // Active price alerts too, so alert checks have history
  try {
    const a = await query(`SELECT DISTINCT keywords FROM price_alerts WHERE triggered_at IS NULL AND dismissed_at IS NULL`);
    for (const row of a.rows) add(row.keywords);
  } catch (err) { console.warn('[Snapshot] price_alerts scan skipped:', err.message); }

  return [...set];
}

export async function runSnapshotJob() {
  const keywords = await collectTrackedKeywords();
  const batch = keywords.slice(0, MAX_KEYWORDS_PER_RUN);
  if (keywords.length > MAX_KEYWORDS_PER_RUN) {
    console.warn(`[Snapshot] ${keywords.length} keywords tracked; capping at ${MAX_KEYWORDS_PER_RUN} for free-tier budget`);
  }

  const stats = { attempted: batch.length, stored: 0, empty: 0, failed: 0, rateLimited: false };
  for (const kw of batch) {
    try {
      const sales = await fetchSoldSales(kw, { limit: RECORDS_PER_FETCH, daysBack: 3, persist: true });
      if (sales.length > 0) stats.stored++; else stats.empty++;
    } catch (err) {
      stats.failed++;
      if (/429/.test(err.message)) { stats.rateLimited = true; break; }
      console.warn(`[Snapshot] "${kw}" failed:`, err.message);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // Prune history older than 90 days so the table stays small on the free Postgres tier
  await query(`DELETE FROM price_snapshots WHERE fetched_at < NOW() - INTERVAL '90 days'`)
    .catch(err => console.warn('[Snapshot] Prune failed:', err.message));

  console.log('[Snapshot] Done:', JSON.stringify(stats));
  return stats;
}
