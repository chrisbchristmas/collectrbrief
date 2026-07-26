// routes/subscribers.js — Subscriber CRUD + Stripe checkout
import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db/index.js';
import { sendWelcome } from '../services/emailer.js';

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/subscribers — create subscriber + initiate Stripe checkout
router.post('/', async (req, res, next) => {
  try {
    const { email, first_name, niche, watchlist } = req.body;

    if (!email || !niche || !Array.isArray(watchlist) || watchlist.length === 0) {
      return res.status(400).json({ error: 'email, niche, and watchlist are required' });
    }
    if (watchlist.length > 15) {
      return res.status(400).json({ error: 'Maximum 15 watchlist items' });
    }

    // Upsert subscriber
    const result = await query(
      `INSERT INTO subscribers (email, first_name, niche, watchlist)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             niche = EXCLUDED.niche,
             watchlist = EXCLUDED.watchlist,
             updated_at = NOW()
       RETURNING id, email, subscription_status`,
      [email.toLowerCase().trim(), first_name || null, niche, JSON.stringify(watchlist)]
    );

    const subscriber = result.rows[0];

    // If no Stripe, just welcome them and return
    if (!stripe) {
      await sendWelcome(email, first_name);
      return res.json({ subscriberId: subscriber.id, checkoutUrl: null, status: 'active' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email.toLowerCase().trim(),
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      metadata: { subscriber_id: subscriber.id },
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

// GET /api/subscribers/:id — get subscriber info (for preferences page)
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, niche, watchlist, subscription_status, created_at
       FROM subscribers WHERE id=$1 AND unsubscribed_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/subscribers/:id — update watchlist / preferences
router.patch('/:id', async (req, res, next) => {
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
