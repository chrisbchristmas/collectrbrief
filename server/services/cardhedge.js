// services/cardhedge.js — Sold-price data via The Card API (thecardapi.com)
// Free tier: 5,000 records/day, 3-day lookback, no credit card required.
// Note: file name kept as cardhedge.js for backward compatibility with existing
// imports across the codebase (briefEngine.js, publicContent.js, routes/public.js);
// the actual provider is now The Card API, not CardHedge.

const BASE_URL = 'https://thecardapi.com/api/v1/market';
const API_KEY = process.env.CARDHEDGE_API_KEY; // holds a thecardapi.com "tca_..." key

/**
 * Fetch recent sold sales for a keyword from The Card API.
 * Returns an array of { title, price, date, source, url } objects.
 */
export async function fetchSoldSales(keywords, options = {}) {
  const { limit = 20, daysBack = 7 } = options;

  if (!API_KEY) {
    console.warn('[CardData] No API key — returning mock data');
    return getMockSales(keywords);
  }

  // Free tier is capped at a 3-day lookback; requesting more than the plan
  // allows returns a 422, so clamp client-side rather than surface an error.
  const effectiveDaysBack = Math.min(daysBack, 3);
  const dateFrom = new Date(Date.now() - effectiveDaysBack * 86400000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    q: keywords,
    date_from: dateFrom,
    limit: String(Math.min(limit, 1000)),
    sort: 'date_desc',
  });

  const res = await fetch(`${BASE_URL}/sales?${params}`, {
    headers: {
      'x-market-api-key': API_KEY,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429) {
    console.warn('[CardData] Daily rate limit reached — falling back to mock data');
    return getMockSales(keywords);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Card API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const records = json.data || json.results || [];

  // Normalise to the shape the rest of the app expects (title, price, date, source, url)
  // grader/grade/listingType are carried through for insight computation (grading
  // premium, marketplace spread) at zero extra API cost.
  const sales = records.map(item => ({
    title: item.title || keywords,
    price: parseFloat(item.price || 0),
    date: item.sold_at || item.date || null,
    source: normalisePlatform(item.platform),
    url: item.url || item.listing_url || null,
    grader: item.grader || null,
    grade: item.grade != null ? String(item.grade) : null,
    listingType: item.listing_type || null,
  }));

  return sales;
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
 * Compute simple trend metrics from a sales array.
 * Returns { avg, min, max, count, trend, pctChange }
 */
export function computeTrend(sales) {
  if (!sales || sales.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data', pctChange: 0 };
  }

  const prices = sales.map(s => s.price).filter(p => p > 0);
  if (prices.length === 0) return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data', pctChange: 0 };

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Simple trend: compare first half vs second half avg
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
    count: prices.length,
    trend,
    pctChange,
  };
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
