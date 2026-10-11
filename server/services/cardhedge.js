// services/cardhedge.js — Sold-price data via The Card API (thecardapi.com)
// Free tier: 5,000 records/day, 3-day lookback, no credit card required.
// Note: file name kept as cardhedge.js for backward compatibility with existing
// imports across the codebase (briefEngine.js, publicContent.js, routes/public.js);
// the actual provider is now The Card API, not CardHedge.
//
// Because the free tier only looks back 3 days, every live fetch is persisted to
// price_snapshots and merged with the last `daysBack` days of stored sales for the
// same keywords. A daily snapshot job (jobs/snapshotPrices.js) keeps that history
// warm so the Sunday brief genuinely covers a full week — and the prior week is
// available for true week-over-week % change.

import { query } from '../db/index.js';

const BASE_URL = 'https://thecardapi.com/api/v1/market';
const API_KEY = process.env.CARDHEDGE_API_KEY; // holds a thecardapi.com "tca_..." key
const SNAPSHOT_SOURCE = 'thecardapi';
const FREE_TIER_LOOKBACK_DAYS = 3;

/**
 * Fetch recent sold sales for a keyword from The Card API, merged with stored
 * history for the requested window.
 * Returns an array of { title, price, date, source, url, grader, grade, listingType }.
 * @param {string} keywords
 * @param {{limit?:number, daysBack?:number, persist?:boolean}} options
 */
export async function fetchSoldSales(keywords, options = {}) {
  const { limit = 50, daysBack = 7, persist = true } = options;
  const normKeywords = normaliseKeywords(keywords);

  if (!API_KEY) {
    console.warn('[CardData] No API key — returning mock data');
    return getMockSales(keywords);
  }

  // Free tier is capped at a 3-day lookback; requesting more than the plan
  // allows returns a 422, so clamp client-side rather than surface an error.
  const effectiveDaysBack = Math.min(daysBack, FREE_TIER_LOOKBACK_DAYS);
  const dateFrom = new Date(Date.now() - effectiveDaysBack * 86400000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    q: keywords,
    date_from: dateFrom,
    limit: String(Math.min(Math.max(limit, 50), 1000)),
    sort: 'date_desc',
  });

  let live = [];
  const res = await fetch(`${BASE_URL}/sales?${params}`, {
    headers: { 'x-market-api-key': API_KEY },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429) {
    console.warn('[CardData] Daily rate limit reached — using stored history only');
  } else if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Card API ${res.status}: ${body.slice(0, 200)}`);
  } else {
    const json = await res.json();
    const records = json.data || json.results || [];
    // Normalise to the shape the rest of the app expects (title, price, date, source, url)
    // grader/grade/listingType are carried through for insight computation (grading
    // premium, marketplace spread) at zero extra API cost.
    live = records.map(item => ({
      id: item.id || null,
      title: item.title || keywords,
      price: parseFloat(item.price || 0),
      date: item.sold_at || item.sale_date || item.date || null,
      source: normalisePlatform(item.platform),
      url: item.listing_url || item.url || null,
      grader: item.grader || null,
      grade: item.grade != null ? String(item.grade) : null,
      listingType: item.listing_type || null,
    }));
  }

  // Keep only listings that match the grade the subscriber actually asked for
  // (e.g. "PSA 10" must not surface a PSA 2 sticker or a raw card).
  live = filterByRequestedGrade(live, keywords);

  if (persist && live.length > 0) {
    await storeSnapshot(normKeywords, live).catch(err =>
      console.warn('[CardData] Snapshot store failed:', err.message)
    );
  }

  const stored = await loadSnapshots(normKeywords, daysBack).catch(err => {
    console.warn('[CardData] Snapshot load failed:', err.message);
    return [];
  });

  const merged = dedupeSales([...live, ...stored])
    .filter(s => !s.date || Date.now() - new Date(s.date).getTime() <= daysBack * 86400000)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return merged.slice(0, Math.max(limit, 50));
}

/**
 * Average sold price for the window ending `daysBack` days ago and spanning
 * `windowDays` days — i.e. getPriorWindowAvg(k, 7, 7) is "last week". Pulled
 * from stored snapshots only (zero API calls). Returns { avg, count } or null.
 */
export async function getPriorWindowAvg(keywords, daysBack = 7, windowDays = 7) {
  const normKeywords = normaliseKeywords(keywords);
  const to = new Date(Date.now() - daysBack * 86400000);
  const from = new Date(to.getTime() - windowDays * 86400000);
  const rows = await loadSnapshots(normKeywords, daysBack + windowDays).catch(() => []);
  const prices = trimOutliers(
    dedupeSales(rows)
      .filter(s => s.date && new Date(s.date) >= from && new Date(s.date) < to)
      .map(s => s.price)
      .filter(p => p > 0)
  );
  if (prices.length === 0) return null;
  return {
    avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    count: prices.length,
  };
}

function normaliseKeywords(keywords) {
  return String(keywords || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function storeSnapshot(normKeywords, sales) {
  await query(
    `INSERT INTO price_snapshots (keywords, source, data) VALUES ($1, $2, $3)`,
    [normKeywords, SNAPSHOT_SOURCE, JSON.stringify(sales)]
  );
}

async function loadSnapshots(normKeywords, days) {
  const r = await query(
    `SELECT data FROM price_snapshots
     WHERE keywords = $1 AND source = $2 AND fetched_at >= NOW() - ($3 || ' days')::interval
     ORDER BY fetched_at DESC LIMIT 40`,
    [normKeywords, SNAPSHOT_SOURCE, String(Math.ceil(days))]
  );
  return r.rows.flatMap(row => (Array.isArray(row.data) ? row.data : []));
}

function saleKey(s) {
  if (s.id) return `id:${s.id}`;
  if (s.url) return `url:${s.url}`;
  return `t:${String(s.title).toLowerCase()}|${s.price}|${(s.date || '').slice(0, 10)}`;
}

function dedupeSales(sales) {
  const seen = new Set();
  const out = [];
  for (const s of sales) {
    const k = saleKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/**
 * If the keywords name a grade ("PSA 10", "BGS 9.5", "SGC 8", "CGC 9.8"), drop
 * records that are graded differently or not graded at all. Ungraded keywords
 * leave the data untouched.
 */
export function filterByRequestedGrade(sales, keywords) {
  const m = String(keywords || '').match(/\b(PSA|BGS|SGC|CGC|CSG|TAG|HGA)\s*-?\s*(10|9\.8|9\.6|9\.5|9\.4|9\.2|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/i);
  if (!m) return sales;
  const wantGrader = m[1].toUpperCase();
  const wantGrade = parseFloat(m[2]);
  return sales.filter(s => {
    let grader = s.grader ? String(s.grader).toUpperCase() : null;
    let grade = s.grade != null ? parseFloat(s.grade) : NaN;
    if (!grader || Number.isNaN(grade)) {
      // API didn't tag it — fall back to parsing the listing title
      const t = String(s.title || '').match(/\b(PSA|BGS|SGC|CGC|CSG|TAG|HGA)\s*-?\s*(\d{1,2}(?:\.\d)?)\b/i);
      if (!t) return false;
      grader = t[1].toUpperCase();
      grade = parseFloat(t[2]);
    }
    return grader === wantGrader && grade === wantGrade;
  });
}

function normalisePlatform(platform) {
  const map = {
    ebay: 'eBay',
    tcgplayer: 'TCGplayer',
    goldin: 'Goldin',
    lelands: "Lelands",
    scp: 'SCP Auctions',
    hakes: "Hake's",
    rea: 'REA',
  };
  return map[String(platform || '').toLowerCase()] || (platform || 'Unknown');
}

/**
 * Drop wild outliers (mis-matched listings, lots, typos) using a median band.
 * Needs 4+ prices to act; keeps everything inside 0.4x–2.5x the median.
 */
export function trimOutliers(prices) {
  if (!prices || prices.length < 4) return prices || [];
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const kept = prices.filter(p => p >= median * 0.4 && p <= median * 2.5);
  return kept.length >= 3 ? kept : prices;
}

/**
 * Compute simple trend metrics from a sales array.
 * Returns { avg, min, max, count, trend, pctChange, median }
 * pctChange is newer-half vs older-half (chronological) within the window;
 * callers may overwrite it with a true week-over-week figure when history exists.
 */
export function computeTrend(sales) {
  if (!sales || sales.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data', pctChange: 0, median: 0 };
  }

  // Chronological order so "older vs newer" means what it says
  const ordered = [...sales]
    .filter(s => s.price > 0)
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const allPrices = ordered.map(s => s.price);
  const band = new Set(trimOutliers(allPrices));
  const kept = ordered.filter(s => band.has(s.price));
  const prices = kept.map(s => s.price);
  if (prices.length === 0) return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data', pctChange: 0, median: 0 };

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

  let trend = 'stable';
  let pctChange = 0;
  if (prices.length >= 4) {
    const mid = Math.floor(prices.length / 2);
    const olderAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const newerAvg = prices.slice(mid).reduce((a, b) => a + b, 0) / (prices.length - mid);
    pctChange = Math.round((((newerAvg - olderAvg) / olderAvg) * 100) * 10) / 10;
    if (pctChange > 8) trend = 'up';
    else if (pctChange < -8) trend = 'down';
    else trend = 'stable';
  }

  return {
    avg: Math.round(avg * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    median: Math.round(median * 100) / 100,
    count: prices.length,
    trend,
    pctChange,
  };
}

/**
 * Overlay a true week-over-week change onto a trend object when prior-week
 * history exists. Mutates and returns `trend`; adds { wowPct, prevAvg, prevCount }.
 */
export async function applyWeekOverWeek(keywords, trend) {
  if (!trend || trend.count === 0) return trend;
  const prior = await getPriorWindowAvg(keywords, 7, 7);
  if (!prior || prior.avg <= 0) return trend;
  const wowPct = Math.round((((trend.avg - prior.avg) / prior.avg) * 100) * 10) / 10;
  trend.wowPct = wowPct;
  trend.prevAvg = prior.avg;
  trend.prevCount = prior.count;
  trend.pctChange = wowPct;
  if (wowPct > 8) trend.trend = 'up';
  else if (wowPct < -8) trend.trend = 'down';
  else trend.trend = 'stable';
  return trend;
}

/**
 * Compute zero-extra-cost insights from a sales array:
 *  - gradingPremium: avg price gap between the two most common grades in the data
 *    (e.g. "PSA 10 sells for +340% over PSA 9")
 *  - marketplaceSpread: avg price gap between marketplaces when the same item
 *    sold on 2+ platforms this window (arbitrage signal)
 * Returns { gradingPremium: {...}|null, marketplaceSpread: {...}|null }
 */
export function computeInsights(sales) {
  const insights = { gradingPremium: null, marketplaceSpread: null };
  if (!sales || sales.length < 4) return insights;

  const valid = sales.filter(s => s.price > 0);

  // --- Grading premium: group graded sales by "GRADER GRADE" key ---
  const byGrade = {};
  for (const s of valid) {
    if (!s.grader || !s.grade) continue;
    const key = `${s.grader.toUpperCase()} ${s.grade}`;
    (byGrade[key] = byGrade[key] || []).push(s.price);
  }
  // Need 2+ grade groups with 2+ sales each for a meaningful comparison
  const gradeGroups = Object.entries(byGrade)
    .filter(([, prices]) => prices.length >= 2)
    .map(([key, prices]) => ({
      key,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      count: prices.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (gradeGroups.length >= 2) {
    const high = gradeGroups[0];
    const low = gradeGroups[gradeGroups.length - 1];
    if (low.avg > 0 && high.key !== low.key) {
      insights.gradingPremium = {
        highGrade: high.key,
        highAvg: Math.round(high.avg * 100) / 100,
        highCount: high.count,
        lowGrade: low.key,
        lowAvg: Math.round(low.avg * 100) / 100,
        lowCount: low.count,
        premiumPct: Math.round(((high.avg - low.avg) / low.avg) * 100),
      };
    }
  }

  // --- Marketplace spread: avg price per platform (2+ sales per platform) ---
  const bySource = {};
  for (const s of valid) {
    if (!s.source || s.source === 'Unknown') continue;
    (bySource[s.source] = bySource[s.source] || []).push(s.price);
  }
  const sourceGroups = Object.entries(bySource)
    .filter(([, prices]) => prices.length >= 2)
    .map(([source, prices]) => ({
      source,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      count: prices.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (sourceGroups.length >= 2) {
    const high = sourceGroups[0];
    const low = sourceGroups[sourceGroups.length - 1];
    if (low.avg > 0) {
      const spreadPct = Math.round(((high.avg - low.avg) / low.avg) * 100);
      // Only surface when the spread is material (>10%)
      if (spreadPct > 10) {
        insights.marketplaceSpread = {
          highSource: high.source,
          highAvg: Math.round(high.avg * 100) / 100,
          lowSource: low.source,
          lowAvg: Math.round(low.avg * 100) / 100,
          spreadPct,
        };
      }
    }
  }

  return insights;
}

function getMockSales(keywords) {
  const base = 85 + Math.random() * 200;
  return Array.from({ length: 8 }, (_, i) => ({
    title: `${keywords} (mock #${i + 1})`,
    price: parseFloat((base * (0.85 + Math.random() * 0.35)).toFixed(2)),
    date: new Date(Date.now() - i * 86400000 * Math.random() * 3).toISOString(),
    source: ['eBay', 'Goldin', 'TCGplayer'][i % 3],
    url: null,
  }));
}
