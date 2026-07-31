// routes/webhooks.js — Stripe webhook handler
import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db/index.js';
import { sendWelcome } from '../services/emailer.js';

const router = Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// POST /api/webhooks/stripe
// Body is raw buffer (see index.js — mounted before json middleware)
router.post('/stripe', async (req, res) => {
  if (!stripe) {
    console.warn('[Webhook] Stripe not configured');
    return res.sendStatus(200);
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Webhook] ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriberId = session.metadata?.subscriber_id;
      if (!subscriberId) break;

      await query(
        `UPDATE subscribers
         SET stripe_customer_id=$1, stripe_subscription_id=$2,
             subscription_status='active', plan='pro', updated_at=NOW()
         WHERE id=$3`,
        [session.customer, session.subscription, subscriberId]
      );

      // Referral credit: give the referrer one free month (Stripe balance credit)
      // Fires once per referred subscriber (referral_credited flag).
      try {
        const refRow = await query(
          `SELECT s.referred_by, r.stripe_customer_id AS referrer_customer, r.email AS referrer_email
           FROM subscribers s
           LEFT JOIN subscribers r ON r.id = s.referred_by
           WHERE s.id=$1 AND s.referred_by IS NOT NULL AND s.referral_credited = FALSE`,
          [subscriberId]
        );
        if (refRow.rows.length > 0 && refRow.rows[0].referrer_customer) {
          const monthlyPriceCents = Number(process.env.REFERRAL_CREDIT_CENTS || 999);
          await stripe.customers.createBalanceTransaction(refRow.rows[0].referrer_customer, {
            amount: -monthlyPriceCents, // negative = credit toward future invoices
            currency: 'usd',
            description: 'CollectrBrief referral credit — 1 month free',
          });
          await query(`UPDATE subscribers SET referral_credited = TRUE WHERE id=$1`, [subscriberId]);
          console.log(`[Webhook] Referral credit granted to ${refRow.rows[0].referrer_email}`);
        }
      } catch (e) {
        console.error('[Webhook] Referral credit failed:', e.message);
      }

      // Send welcome email
      const sub = await query('SELECT email, first_name FROM subscribers WHERE id=$1', [subscriberId]);
      if (sub.rows.length > 0) {
        await sendWelcome(sub.rows[0].email, sub.rows[0].first_name).catch(e =>
          console.error('[Webhook] Welcome email failed:', e.message)
        );
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      await query(
        `UPDATE subscribers
         SET subscription_status=$1, stripe_subscription_id=$2, updated_at=NOW()
         WHERE stripe_customer_id=$3`,
        [subscription.status, subscription.id, customerId]
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await query(
        `UPDATE subscribers
         SET subscription_status='canceled', plan='free', updated_at=NOW()
         WHERE stripe_subscription_id=$1`,
        [subscription.id]
      );
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await query(
        `UPDATE subscribers SET subscription_status='past_due', updated_at=NOW()
         WHERE stripe_customer_id=$1`,
        [invoice.customer]
      );
      break;
    }

    default:
      // Unhandled event — ignore silently
  }

  res.sendStatus(200);
});

export default router;
