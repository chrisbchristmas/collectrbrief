// routes/admin.js — Internal admin endpoints (protected by ADMIN_KEY env var)
import { Router } from 'express';
import { query } from '../db/index.js';
import { generateBriefForSubscriber } from '../services/briefEngine.js';
import { sendBrief } from '../services/emailer.js';

const router = Router();

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [subs, briefs] = await Promise.all([
      query(`SELECT subscription_status, COUNT(*) as count FROM subscribers
             WHERE unsubscribed_at IS NULL GROUP BY subscription_status`),
      query(`SELECT status, COUNT(*) as count FROM briefs
             WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY status`),
    ]);
    res.json({ subscribers: subs.rows, briefs_this_week: briefs.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/subscribers
router.get('/subscribers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, first_name, niche, watchlist, subscription_status, created_at
       FROM subscribers WHERE unsubscribed_at IS NULL ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/trigger-brief — manually trigger brief for one or all active subscribers
// Body: { subscriber_id?: string }  — omit to run for all active subs
router.post('/trigger-brief', async (req, res, next) => {
  try {
    const { subscriber_id } = req.body || {};
    const weekOf = getMostRecentSunday();

    let subscribers;
    if (subscriber_id) {
      const r = await query(
        `SELECT * FROM subscribers WHERE id=$1 AND unsubscribed_at IS NULL`,
        [subscriber_id]
      );
      subscribers = r.rows;
    } else {
      const r = await query(
        `SELECT * FROM subscribers
         WHERE unsubscribed_at IS NULL
           AND subscription_status IN ('active', 'trialing')
         LIMIT 10`
      );
      subscribers = r.rows;
    }

    const results = [];
    for (const sub of subscribers) {
      try {
        const { briefId, html } = await generateBriefForSubscriber(sub, weekOf);
        await sendBrief(sub.email, `Your CollectrBrief — ${weekLabel(weekOf)}`, html, sub.id);
        await query(`UPDATE briefs SET status='sent', sent_at=NOW() WHERE id=$1`, [briefId]);
        results.push({ email: sub.email, status: 'sent', briefId });
      } catch (err) {
        results.push({ email: sub.email, status: 'failed', error: err.message });
      }
    }

    res.json({ weekOf, results });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/preview-brief/:subscriberId — preview without sending
router.get('/preview-brief/:subscriberId', async (req, res, next) => {
  try {
    const subResult = await query(
      `SELECT * FROM subscribers WHERE id=$1`,
      [req.params.subscriberId]
    );
    if (subResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const weekOf = getMostRecentSunday();
    const { html, itemResults, commentary } = await generateBriefForSubscriber(subResult.rows[0], weekOf);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

function getMostRecentSunday() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // roll back to Sunday
  return d.toISOString().split('T')[0];
}

function weekLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default router;
