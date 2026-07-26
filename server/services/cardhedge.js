// services/cardhedge.js — CardHedge pay-per-call API ($0.01/call)
// api.cardhedger.com — aggregates eBay sold, Heritage, Fanatics

const BASE_URL = 'https://api.cardhedger.com';
const API_KEY = process.env.CARDHEDGE_API_KEY;

/**
 * Fetch recent sold sales for a keyword from CardHedge.
 * Returns an array of { title, price, date, source, url } objects.
 */
export async function fetchSoldSales(keywords, options = {}) {
  const { limit = 20, daysBack = 7 } = options;

  if (!API_KEY) {
    console.warn('[CardHedge] No API key — returning mock data');
    return getMockSales(keywords);
  }

  const params = new URLSearchParams({
    q: keywords,
    limit: String(limit),
    days: String(daysBack),
  });

  const res = await fetch(`${BASE_URL}/v1/sold?${params}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CardHedge API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  // Normalise to a consistent shape regardless of their response schema
  const sales = (json.results || json.data || json.sales || []).map(item => ({
    title: item.title || item.name || keywords,
    price: parseFloat(item.price || item.sold_price || item.amount || 0),
    date: item.date || item.sold_date || item.ended_at || null,
    source: item.source || item.platform || 'eBay',
    url: item.url || item.listing_url || null,
  }));

  return sales;
}

/**
 * Compute simple trend metrics from a sales array.
 * Returns { avg, min, max, count, trend }
 */
export function computeTrend(sales) {
  if (!sales || sales.length === 0) {
    return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data' };
  }

  const prices = sales.map(s => s.price).filter(p => p > 0);
  if (prices.length === 0) return { avg: 0, min: 0, max: 0, count: 0, trend: 'insufficient data' };

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  // Simple trend: compare first half vs second half avg
  let trend = 'stable';
  if (prices.length >= 4) {
    const mid = Math.floor(prices.length / 2);
    const olderAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const newerAvg = prices.slice(mid).reduce((a, b) => a + b, 0) / (prices.length - mid);
    const pctChange = ((newerAvg - olderAvg) / olderAvg) * 100;
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
  };
}

function getMockSales(keywords) {
  const base = 85 + Math.random() * 200;
  return Array.from({ length: 8 }, (_, i) => ({
    title: `${keywords} (mock #${i + 1})`,
    price: parseFloat((base * (0.85 + Math.random() * 0.35)).toFixed(2)),
    date: new Date(Date.now() - i * 86400000 * Math.random() * 3).toISOString(),
    source: ['eBay', 'Heritage', 'Fanatics'][i % 3],
    url: null,
  }));
}
