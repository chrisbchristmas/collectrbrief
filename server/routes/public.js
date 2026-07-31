// routes/public.js — Public, no-auth pages served by the API
// /b/:briefId?t=<token>   — shareable web version of a brief
// /sample                 — latest public sample brief (landing page CTA)
// /market/:nicheSlug      — weekly SEO market roundup page

import { Router } from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../utils/token.js';

const router = Router();

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
