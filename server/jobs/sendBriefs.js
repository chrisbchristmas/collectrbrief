// jobs/sendBriefs.js — Weekly Sunday 8am cron job
// Uses node-cron. Sends personalized briefs to all active subscribers.

import cron from 'node-cron';
import { query } from '../db/index.js';
import { generateBriefForSubscriber, buildSubjectLine } from '../services/briefEngine.js';
import { sendBrief } from '../services/emailer.js';
import { generateSampleBrief, generateMarketPages } from '../services/publicContent.js';

const BATCH_SIZE = 10; // Process subscribers in batches to avoid hammering APIs
const BATCH_DELAY_MS = 2000;

export function scheduleBriefJob() {
  // Every Sunday at 8:00am server time
  cron.schedule('0 8 * * 0', () => {
    console.log('[BriefJob] Weekly brief run starting...');
    runBriefJob().catch(err => console.error('[BriefJob] Fatal error:', err));
  });
  console.log('[BriefJob] Scheduled: Sundays at 8:00am');
}

export async function runBriefJob() {
  const weekOf = getMostRecentSunday();
  console.log(`[BriefJob] Week of ${weekOf}`);

  // Get all active/trialing subscribers
  const result = await query(
    `SELECT * FROM subscribers
     WHERE unsubscribed_at IS NULL
       AND subscription_status IN ('active', 'trialing')
     ORDER BY created_at`
  );

  const subscribers = result.rows;
  console.log(`[BriefJob] ${subscribers.length} subscribers to process`);

  const stats = { sent: 0, failed: 0, skipped: 0 };

  // Process in batches
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (sub) => {
        // Skip if already sent this week
        const existing = await query(
          `SELECT id, status FROM briefs WHERE subscriber_id=$1 AND week_of=$2`,
          [sub.id, weekOf]
        );
        if (existing.rows.length > 0 && existing.rows[0].status === 'sent') {
          stats.skipped++;
          return;
        }

        try {
          const { briefId, html, metrics } = await generateBriefForSubscriber(sub, weekOf);
          const subject = buildSubjectLine(metrics, weekOf);
          await sendBrief(sub.email, subject, html, sub.id);
          await query(
            `UPDATE briefs SET status='sent', sent_at=NOW() WHERE id=$1`,
            [briefId]
          );
          stats.sent++;
          console.log(`[BriefJob] ✓ ${sub.email}`);
        } catch (err) {
          stats.failed++;
          console.error(`[BriefJob] ✗ ${sub.email}: ${err.message}`);
        }
      })
    );

    // Delay between batches
    if (i + BATCH_SIZE < subscribers.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`[BriefJob] Done. Sent: ${stats.sent} | Failed: ${stats.failed} | Skipped: ${stats.skipped}`);

  // Regenerate public content (sample brief + SEO market pages) — non-fatal
  try {
    await generateSampleBrief(weekOf);
    await generateMarketPages(weekOf);
  } catch (err) {
    console.error('[BriefJob] Public content generation failed:', err.message);
  }

  return stats;
}

function getMostRecentSunday() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function weekLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
