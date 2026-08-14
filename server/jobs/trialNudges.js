// jobs/trialNudges.js — Day 3 "build your watchlist" + Day 12 "trial ending" emails
// Runs daily. Uses created_at (checkout starts a 14-day Stripe trial) rather than
// a separate trial_ends_at column, since that field isn't populated by the
// current checkout flow (Stripe manages the actual billing trial).

import cron from 'node-cron';
import { query } from '../db/index.js';
import { sendTrialDay3Nudge, sendTrialEndingNudge } from '../services/emailer.js';
import { signToken } from '../utils/token.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function scheduleTrialNudgeJob() {
  // Once a day at 10am server time — clear of the Sunday 8am brief job
  cron.schedule('0 10 * * *', () => {
    console.log('[TrialNudges] Daily run starting...');
    runTrialNudgeJob().catch(err => console.error('[TrialNudges] Fatal error:', err));
  });
  console.log('[TrialNudges] Scheduled: daily at 10:00am');
}

export async function runTrialNudgeJob() {
  const stats = { day3Sent: 0, endingSent: 0, failed: 0 };

  // --- Day 3 nudge: created 2-4 days ago, still trialing, not yet sent ---
  try {
    const day3Candidates = await query(
      `SELECT id, email, first_name, watchlist, created_at
       FROM subscribers
       WHERE unsubscribed_at IS NULL
         AND subscription_status = 'trialing'
         AND trial_day3_sent_at IS NULL
         AND created_at <= NOW() - INTERVAL '3 days'
         AND created_at >= NOW() - INTERVAL '5 days'`
    );

    for (const sub of day3Candidates.rows) {
      try {
        const clientOrigin = process.env.CLIENT_ORIGIN || 'https://www.collectrbrief.com';
        const prefsUrl = `${clientOrigin}/preferences?id=${sub.id}&token=${signToken(sub.id)}`;
        const watchlistCount = Array.isArray(sub.watchlist) ? sub.watchlist.length : 0;
        await sendTrialDay3Nudge(sub.email, sub.first_name, watchlistCount, prefsUrl);
        await query(`UPDATE subscribers SET trial_day3_sent_at = NOW() WHERE id=$1`, [sub.id]);
        stats.day3Sent++;
      } catch (err) {
        stats.failed++;
        console.error(`[TrialNudges] Day3 failed for ${sub.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[TrialNudges] Day3 query failed:', err.message);
  }

  // --- Day 12 nudge: trial ends in ~2 days (14-day trial, created 12-13 days ago) ---
  try {
    const endingCandidates = await query(
      `SELECT id, email, first_name, created_at
       FROM subscribers
       WHERE unsubscribed_at IS NULL
         AND subscription_status = 'trialing'
         AND trial_ending_sent_at IS NULL
         AND created_at <= NOW() - INTERVAL '12 days'
         AND created_at >= NOW() - INTERVAL '14 days'`
    );

    for (const sub of endingCandidates.rows) {
      try {
        const trialEndsAt = new Date(new Date(sub.created_at).getTime() + 14 * DAY_MS);
        await sendTrialEndingNudge(sub.email, sub.first_name, trialEndsAt);
        await query(`UPDATE subscribers SET trial_ending_sent_at = NOW() WHERE id=$1`, [sub.id]);
        stats.endingSent++;
      } catch (err) {
        stats.failed++;
        console.error(`[TrialNudges] Ending nudge failed for ${sub.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[TrialNudges] Ending query failed:', err.message);
  }

  console.log(`[TrialNudges] Done. Day3: ${stats.day3Sent} | Ending: ${stats.endingSent} | Failed: ${stats.failed}`);
  return stats;
}
