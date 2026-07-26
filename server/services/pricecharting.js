// services/pricecharting.js — PriceCharting API ($4.99/mo, included with premium sub)
// Returns historical price data for trading cards, comics, video games

const BASE_URL = 'https://www.pricecharting.com/api';
const API_KEY = process.env.PRICECHARTING_API_KEY;

/**
 * Search for a product by name.
 * Returns the best match { id, name, prices: { loose, graded, ... } }
 */
export async function searchProduct(query) {
  if (!API_KEY) {
    console.warn('[PriceCharting] No API key — returning mock data');
    return getMockProduct(query);
  }

  const params = new URLSearchParams({ id: 'search', q: query, status: 'f' });
  const res = await fetch(`${BASE_URL}/product?${params}&type=json`, {
    headers: { Authorization: `token ${API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`PriceCharting API ${res.status}`);
  }

  const json = await res.json();
  if (!json.products || json.products.length === 0) return null;

  const product = json.products[0];
  return normaliseProduct(product);
}

/**
 * Get prices for a specific product by ID.
 */
export async function getProductById(productId) {
  if (!API_KEY) return getMockProduct(`product-${productId}`);

  const res = await fetch(`${BASE_URL}/product?id=${productId}&status=f&type=json`, {
    headers: { Authorization: `token ${API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`PriceCharting API ${res.status}`);

  const json = await res.json();
  return normaliseProduct(json);
}

function normaliseProduct(raw) {
  return {
    id: raw.id,
    name: raw['product-name'] || raw.name || 'Unknown',
    consoleName: raw['console-name'] || raw.category || '',
    prices: {
      ungraded: raw['loose-price'] ? raw['loose-price'] / 100 : null,
      cib: raw['cib-price'] ? raw['cib-price'] / 100 : null,
      new: raw['new-price'] ? raw['new-price'] / 100 : null,
      graded: raw['graded-price'] ? raw['graded-price'] / 100 : null,
      manual: raw['manual-only-price'] ? raw['manual-only-price'] / 100 : null,
    },
    url: raw['id'] ? `https://www.pricecharting.com/game/${encodeURIComponent(raw['console-name'] || '')}/${encodeURIComponent(raw['product-name'] || '')}` : null,
  };
}

function getMockProduct(query) {
  const base = 40 + Math.random() * 300;
  return {
    id: 'mock-' + query.replace(/\s+/g, '-').toLowerCase(),
    name: query,
    consoleName: 'Pokemon Cards',
    prices: {
      ungraded: parseFloat((base * 0.6).toFixed(2)),
      graded: parseFloat((base * 1.8).toFixed(2)),
      cib: parseFloat((base * 0.9).toFixed(2)),
    },
    url: null,
  };
}
