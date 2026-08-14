// routes/public.js — Public, no-auth pages served by the API
// /b/:briefId?t=<token>   — shareable web version of a brief
// /sample                 — latest public sample brief (landing page CTA)
// /market/:nicheSlug      — weekly SEO market roundup page
// POST /api/public/price-check — free single-item lookup lead magnet

import { Router } from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../utils/token.js';
import { fetchSoldSales, computeTrend } from '../services/cardhedge.js';

const router = Router();

// Very light in-memory rate limit: max 8 lookups per IP per hour.
// Resets on process restart — acceptable for a free-tier abuse guard.
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (rateLimitMap.get(ip) || []).filter(t => now - t < windowMs);
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return hits.length > 8;
}

// POST /api/public/price-check — { keywords, email? }
// Returns a single free trend lookup. If email is provided, stores the lead
// for follow-up (no email is sent synchronously — keeps this endpoint fast).
router.post('/api/public/price-check', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many lookups — try again in a bit.' });
    }

    const keywords = String(req.body?.keywords || '').trim().slice(0, 120);
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase().slice(0, 200) : null;

    if (keywords.length < 3) {
      return res.status(400).json({ error: 'Enter an item name (e.g. "PSA 10 Charizard Base Set")' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const sales = await fetchSoldSales(keywords, { limit: 12, daysBack: 14 });
    const trend = computeTrend(sales);
    const result = {
      keywords,
      trend,
      recentSales: sales.slice(0, 5).map(s => ({ title: s.title, price: s.price, source: s.source, date: s.date })),
    };

    await query(
      `INSERT INTO price_check_leads (email, keywords, result) VALUES ($1, $2, $3)`,
      [email, keywords, JSON.stringify(result)]
    ).catch(err => console.warn('[PriceCheck] Lead insert failed:', err.message));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /b/:briefId — tokenized shareable brief
router.get('/b/:briefId', async (req, res, next) => {
  try {
    if (!verifyToken(req.params.briefId, req.query.t)) {
      return res.status(403).send(shell('Link invalid', '<p>This share link is not valid.</p>'));
    }
    const r = await query(
      `SELECT generated_html FROM briefs WHERE id=$1 AND generated_html IS NOT NULL`,
      [req.params.briefId]
    );
    if (r.rows.length === 0) return res.status(404).send(shell('Not found', '<p>This brief no longer exists.</p>'));
    res.setHeader('Content-Type', 'text/html');
    // Robots: shared briefs shouldn't be indexed (they're personal)
    res.setHeader('X-Robots-Tag', 'noindex');
    res.send(injectCta(r.rows[0].generated_html));
  } catch (err) {
    next(err);
  }
});

// GET /sample — latest weekly sample brief (public, indexable)
router.get('/sample', async (req, res, next) => {
  try {
    const r = await query(`SELECT html FROM sample_briefs ORDER BY week_of DESC LIMIT 1`);
    if (r.rows.length === 0) {
      return res.status(404).send(shell('Coming soon', '<p>The sample brief is generated every Sunday. Check back shortly.</p>'));
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(injectCta(r.rows[0].html));
  } catch (err) {
    next(err);
  }
});

// GET /market/:nicheSlug — latest market roundup for a niche (SEO page)
router.get('/market/:nicheSlug', async (req, res, next) => {
  try {
    const slug = String(req.params.nicheSlug).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const r = await query(
      `SELECT html FROM market_pages WHERE niche_slug=$1 ORDER BY week_of DESC LIMIT 1`,
      [slug]
    );
    if (r.rows.length === 0) return res.status(404).send(shell('Not found', '<p>No market page for this niche yet.</p>'));
    res.setHeader('Content-Type', 'text/html');
    res.send(r.rows[0].html);
  } catch (err) {
    next(err);
  }
});

// GET /trending — this week's biggest movers across all niches (SEO + shareable)
router.get('/trending', async (req, res, next) => {
  try {
    const r = await query(`SELECT html FROM trending_pages ORDER BY week_of DESC LIMIT 1`);
    if (r.rows.length === 0) {
      return res.status(404).send(shell('Coming soon', '<p>The trending leaderboard is generated every Sunday. Check back shortly.</p>'));
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(r.rows[0].html);
  } catch (err) {
    next(err);
  }
});

// Append a signup CTA banner to shared/sample brief HTML
function injectCta(html) {
  const origin = process.env.CLIENT_ORIGIN || 'https://www.collectrbrief.com';
  const cta = `
  <div style="max-width:620px;margin:0 auto;padding:0 16px 40px;font-family:Georgia,serif">
    <div style="background:#1a1a1a;border-radius:8px;padding:28px 24px;text-align:center">
      <p style="color:#fff;font-size:18px;font-weight:700;margin:0 0 6px">Want this for YOUR collection?</p>
      <p style="color:#aaa;font-size:14px;margin:0 0 16px">Your items. Your prices. Every Sunday. 14 days free.</p>
      <a href="${origin}/subscribe" style="display:inline-block;background:#fff;color:#1a1a1a;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px">Start your free trial →</a>
    </div>
  </div>`;
  return html.includes('</body>') ? html.replace('</body>', cta + '</body>') : html + cta;
}

function shell(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · CollectrBrief</title></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:60px 16px;text-align:center">
<div style="max-width:480px;margin:0 auto"><h1 style="font-size:24px;color:#1a1a1a">CollectrBrief</h1><h2 style="font-size:18px;color:#444">${title}</h2>${body}
<p><a href="${process.env.CLIENT_ORIGIN || 'https://www.collectrbrief.com'}" style="color:#888">← collectrbrief.com</a></p></div></body></html>`;
}

export default router;
