// routes/subscribers.js — Subscriber CRUD + Stripe checkout
import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db/index.js';
import { sendWelcome } from '../services/emailer.js';
import { verifyToken } from '../utils/token.js';

// Magic-link guard: requires ?token=<hmac> (or x-pref-token header) matching the subscriber id
function requireMagicToken(req, res, next) {
  const token = req.query.token || req.headers['x-pref-token'];
  if (!verifyToken(req.params.id, token)) {
    return res.status(403).json({ error: 'Invalid or missing access token' });
  }
  next();
}

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/subscribers — create subscriber + initiate Stripe checkout
// Body: { email, first_name, niche, watchlist, plan?: 'monthly'|'annual', ref?: <referrer subscriber id> }
router.post('/', async (req, res, next) => {
  try {
    const { email, first_name, niche, watchlist, plan, ref } = req.body;

    if (!email || !niche || !Array.isArray(watchlist) || watchlist.length === 0) {
      return res.status(400).json({ error: 'email, niche, and watchlist are required' });
    }
    if (watchlist.length > 15) {
      return res.status(400).json({ error: 'Maximum 15 watchlist items' });
    }

    // Validate referrer (must be an existing, distinct subscriber)
    let referrerId = null;
    if (ref && /^[0-9a-f-]{36}$/i.test(ref)) {
      const r = await query(
        `SELECT id FROM subscribers WHERE id=$1 AND unsubscribed_at IS NULL AND email <> $2`,
        [ref, email.toLowerCase().trim()]
      );
      if (r.rows.length > 0) referrerId = r.rows[0].id;
    }

    // Upsert subscriber
    const result = await query(
      `INSERT INTO subscribers (email, first_name, niche, watchlist, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             niche = EXCLUDED.niche,
             watchlist = EXCLUDED.watchlist,
             referred_by = COALESCE(subscribers.referred_by, EXCLUDED.referred_by),
             updated_at = NOW()
       RETURNING id, email, subscription_status`,
      [email.toLowerCase().trim(), first_name || null, niche, JSON.stringify(watchlist), referrerId]
    );

    const subscriber = result.rows[0];

    // If no Stripe, just welcome them and return
    if (!stripe) {
      await sendWelcome(email, first_name);
      return res.json({ subscriberId: subscriber.id, checkoutUrl: null, status: 'active' });
    }

    // Pick price: annual (if configured and requested) or monthly
    const priceId = (plan === 'annual' && process.env.STRIPE_ANNUAL_PRICE_ID)
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_PRICE_ID;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email.toLowerCase().trim(),
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      metadata: { subscriber_id: subscriber.id, plan: plan === 'annual' ? 'annual' : 'monthly' },
      success_url: `${process.env.CLIENT_ORIGIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/?cancelled=1`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { subscriber_id: subscriber.id },
      },
    });

    res.json({ subscriberId: subscriber.id, checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscribers/:id — get subscriber info (for preferences page, magic-link protected)
router.get('/:id', requireMagicToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, niche, watchlist, categories, subscription_status, created_at
       FROM subscribers WHERE id=$1 AND unsubscribed_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subscribers/:id — update watchlist / preferences (magic-link protected)
router.patch('/:id', requireMagicToken, async (req, res, next) => {
  try {
    const { first_name, niche, watchlist } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (first_name !== undefined) { updates.push(`first_name=$${idx++}`); values.push(first_name); }
    if (niche !== undefined) { updates.push(`niche=$${idx++}`); values.push(niche); }
    if (watchlist !== undefined) {
      if (!Array.isArray(watchlist) || watchlist.length > 15) {
        return res.status(400).json({ error: 'Invalid watchlist' });
      }
      updates.push(`watchlist=$${idx++}`); values.push(JSON.stringify(watchlist));
    }
    if (req.body.categories !== undefined) {
      const cats = req.body.categories;
      if (!Array.isArray(cats)) return res.status(400).json({ error: 'categories must be an array' });
      updates.push(`categories=$${idx++}`); values.push(JSON.stringify(cats));
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    updates.push(`updated_at=NOW()`);
    values.push(req.params.id);

    await query(
      `UPDATE subscribers SET ${updates.join(', ')} WHERE id=$${idx} AND unsubscribed_at IS NULL`,
      values
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/subscribers/:id/history?token= — last 12 briefs for chart data
router.get('/:id/history', requireMagicToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, week_of, metrics, status, sent_at,
              raw_data->'items' AS items
       FROM briefs
       WHERE subscriber_id=$1 AND status IN ('sent','generated')
       ORDER BY week_of DESC LIMIT 12`,
      [req.params.id]
    );
    // Slim down: only return label + avg per item (no full sales array)
    const history = result.rows.map(row => ({
      id: row.id,
      week_of: row.week_of,
      metrics: row.metrics,
      sent_at: row.sent_at,
      items: Array.isArray(row.items)
        ? row.items.map(i => ({ label: i.label, avg: i.trend?.avg ?? 0, trend: i.trend?.trend ?? 'stable', count: i.trend?.count ?? 0 }))
        : [],
    }));
    res.json(history);
  } catch (err) { next(err); }
});

// DELETE /api/subscribers/:id/unsubscribe
router.delete('/:id/unsubscribe', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE subscribers SET unsubscribed_at=NOW() WHERE id=$1 RETURNING email, stripe_subscription_id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // Cancel Stripe subscription if one exists
    const { stripe_subscription_id } = result.rows[0];
    if (stripe && stripe_subscription_id) {
      await stripe.subscriptions.cancel(stripe_subscription_id).catch(e =>
        console.warn('[Stripe] Cancel subscription error:', e.message)
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
