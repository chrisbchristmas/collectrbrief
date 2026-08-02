// routes/alerts.js — Price alert CRUD (magic-link protected)
import { Router } from 'express';
import { query } from '../db/index.js';
import { verifyToken } from '../utils/token.js';

const router = Router();

function requireMagicToken(req, res, next) {
  const token = req.query.token || req.headers['x-pref-token'];
  if (!verifyToken(req.params.subscriberId, token)) {
    return res.status(403).json({ error: 'Invalid or missing access token' });
  }
  next();
}

// GET /api/alerts/:subscriberId?token=  — list active (non-dismissed) alerts
router.get('/:subscriberId', requireMagicToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, label, keywords, direction, threshold, triggered_at, created_at
       FROM price_alerts
       WHERE subscriber_id=$1 AND dismissed_at IS NULL
       ORDER BY created_at DESC`,
      [req.params.subscriberId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/alerts/:subscriberId?token=  — create alert
// Body: { label, keywords, direction: 'above'|'below', threshold }
router.post('/:subscriberId', requireMagicToken, async (req, res, next) => {
  try {
    const { label, keywords, direction, threshold } = req.body;
    if (!label || !keywords || !['above', 'below'].includes(direction) || !threshold) {
      return res.status(400).json({ error: 'label, keywords, direction (above|below), and threshold required' });
    }
    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0) return res.status(400).json({ error: 'threshold must be a positive number' });

    // Max 20 alerts per subscriber
    const count = await query(
      `SELECT COUNT(*) FROM price_alerts WHERE subscriber_id=$1 AND dismissed_at IS NULL`,
      [req.params.subscriberId]
    );
    if (parseInt(count.rows[0].count) >= 20) {
      return res.status(400).json({ error: 'Maximum 20 active alerts' });
    }

    const result = await query(
      `INSERT INTO price_alerts (subscriber_id, label, keywords, direction, threshold)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, label, keywords, direction, threshold, created_at`,
      [req.params.subscriberId, label.trim(), keywords.trim(), direction, t]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/alerts/:subscriberId/:alertId?token=  — dismiss alert
router.delete('/:subscriberId/:alertId', requireMagicToken, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE price_alerts SET dismissed_at=NOW()
       WHERE id=$1 AND subscriber_id=$2 AND dismissed_at IS NULL
       RETURNING id`,
      [req.params.alertId, req.params.subscriberId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
