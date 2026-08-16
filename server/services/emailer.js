// services/emailer.js — SendGrid transactional email
// Free tier: 100 emails/day. Growth: Essentials $19.95/mo for 50k/mo.

import sgMail from '@sendgrid/mail';

const FROM_EMAIL = process.env.FROM_EMAIL || 'briefs@collectrbrief.com';
const FROM_NAME = 'CollectrBrief';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send the weekly brief to a subscriber.
 * @param {string} toEmail
 * @param {string} subject
 * @param {string} htmlContent
 * @param {string} subscriberId - used for unsubscribe link
 */
export async function sendBrief(toEmail, subject, htmlContent, subscriberId) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`[Emailer] No SENDGRID_API_KEY — would have sent to ${toEmail}`);
    console.log(`[Emailer] Subject: ${subject}`);
    return { messageId: 'mock-' + Date.now(), mock: true };
  }

  const msg = {
    to: toEmail,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html: htmlContent,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
    },
  };

  try {
    const [response] = await sgMail.send(msg);
    return { messageId: response.headers['x-message-id'], statusCode: response.statusCode };
  } catch (err) {
    const detail = err.response?.body?.errors?.[0]?.message || err.message;
    throw new Error(`SendGrid error: ${detail}`);
  }
}

/**
 * Send a welcome email after signup.
 */
export async function sendWelcome(toEmail, firstName) {
  const subject = `Your first CollectrBrief arrives this Sunday`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:28px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    </div>
    <h2 style="color:#1a1a1a;font-size:22px;margin-bottom:16px">You're in${firstName ? `, ${firstName}` : ''} 🎉</h2>
    <p style="color:#444;line-height:1.7;font-size:16px">
      Every Sunday morning your personalized market brief lands in your inbox — 
      what your specific items sold for this week, whether prices are trending up or down, 
      and an AI-written buy/hold/watch take on your niche.
    </p>
    <p style="color:#444;line-height:1.7;font-size:16px">
      No fluff. No generic market news. Just your items, your prices, your signals.
    </p>
    <p style="color:#888;font-size:14px;margin-top:32px">
      Questions? Reply to this email — we read everything.
    </p>
    <p style="color:#888;font-size:14px">— The CollectrBrief team</p>
  </div>
</body>
</html>`;

  return sendBrief(toEmail, subject, html, null);
}

/**
 * Send a price alert notification email.
 * @param {string} toEmail
 * @param {string|null} firstName
 * @param {object} alert  — { label, direction, threshold }
 * @param {number} currentAvg — the current market avg that triggered the alert
 * @param {string} dashUrl — link to the subscriber's dashboard
 */
export async function sendAlertNotification(toEmail, firstName, alert, currentAvg, dashUrl) {
  const dir = alert.direction === 'above' ? 'above' : 'below';
  const icon = alert.direction === 'above' ? '📈' : '📉';
  const subject = `${icon} Alert: ${alert.label} is now ${dir} $${Number(alert.threshold).toLocaleString()}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
      <p style="color:#888;font-size:13px;margin:4px 0">Price Alert</p>
    </div>
    <div style="background:${alert.direction === 'above' ? '#dcfce7' : '#fee2e2'};border-radius:8px;padding:20px 24px;margin-bottom:24px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">${icon}</div>
      <div style="font-size:20px;font-weight:700;color:${alert.direction === 'above' ? '#166534' : '#991b1b'}">
        ${alert.label}
      </div>
      <div style="color:#444;font-size:15px;margin-top:8px">
        Current market avg: <strong>$${Number(currentAvg).toLocaleString()}</strong>
      </div>
      <div style="color:#666;font-size:14px;margin-top:4px">
        Your alert: ${dir} $${Number(alert.threshold).toLocaleString()}
      </div>
    </div>
    <div style="text-align:center;margin-bottom:32px">
      <a href="${dashUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600">
        View my dashboard →
      </a>
    </div>
    <p style="color:#bbb;font-size:12px;text-align:center">CollectrBrief · This alert has been marked as triggered and won't fire again.</p>
  </div>
</body>
</html>`;

  return sendBrief(toEmail, subject, html, null);
}

/**
 * Trial nudge — Day 3: encourage them to flesh out a thin watchlist.
 */
export async function sendTrialDay3Nudge(toEmail, firstName, watchlistCount, prefsUrl) {
  const subject = `Quick tip: get more out of your CollectrBrief trial`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    </div>
    <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:16px">Hey${firstName ? ` ${firstName}` : ''}, your first brief lands this Sunday</h2>
    <p style="color:#444;line-height:1.7;font-size:16px">
      You're tracking <strong>${watchlistCount} item${watchlistCount === 1 ? '' : 's'}</strong> right now.
      ${watchlistCount < 5
        ? `You can add up to 15 — the more specific items you track, the more useful your Sunday brief becomes.`
        : `Nice list. Make sure every item is as specific as possible (grade, set, year) for the sharpest price matches.`}
    </p>
    <p style="color:#444;line-height:1.7;font-size:16px">
      Two minutes now saves you a thinner first brief on Sunday.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${prefsUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600">
        Review my watchlist →
      </a>
    </div>
    <p style="color:#888;font-size:14px">Questions? Just reply — we read everything.</p>
    <p style="color:#888;font-size:14px">— The CollectrBrief team</p>
  </div>
</body>
</html>`;

  return sendBrief(toEmail, subject, html, null);
}

/**
 * Trial nudge — Day 12: trial ends in 2 days, highest-leverage conversion email.
 */
export async function sendTrialEndingNudge(toEmail, firstName, trialEndsAt) {
  const endDate = new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const subject = `Your CollectrBrief trial ends ${endDate} — here's what continues`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    </div>
    <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:16px">Your trial ends ${endDate}${firstName ? `, ${firstName}` : ''}</h2>
    <p style="color:#444;line-height:1.7;font-size:16px">
      After that, your card will be charged $9.99/month and your weekly brief keeps arriving every Sunday —
      no action needed on your end.
    </p>
    <div style="background:#fff;border:1px solid #eee;border-radius:8px;padding:20px 24px;margin:24px 0">
      <p style="margin:0 0 10px;color:#1a1a1a;font-weight:700;font-size:15px">What continues:</p>
      <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.9">
        <li>Weekly sold prices from eBay, Goldin, TCGplayer & more for your items</li>
        <li>AI-written buy / hold / watch take</li>
        <li>Price alerts and trend tracking</li>
        <li>Your full brief archive and dashboard</li>
      </ul>
    </div>
    <p style="color:#444;line-height:1.7;font-size:16px">
      Not for you? Cancel anytime before ${endDate} from any brief email or your dashboard — no charge, no questions.
    </p>
    <p style="color:#888;font-size:14px;margin-top:24px">Questions? Just reply — we read everything.</p>
    <p style="color:#888;font-size:14px">— The CollectrBrief team</p>
  </div>
</body>
</html>`;

  return sendBrief(toEmail, subject, html, null);
}

/**
 * Win-back email — sent once, 30 days after cancellation.
 */
export async function sendWinBackEmail(toEmail, firstName, resubscribeUrl) {
  const subject = `Here's what you've missed on CollectrBrief`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;margin:0;padding:0">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:26px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px">CollectrBrief</span>
    </div>
    <h2 style="color:#1a1a1a;font-size:20px;margin-bottom:16px">It's been a month${firstName ? `, ${firstName}` : ''} — here's what's happened</h2>
    <p style="color:#444;line-height:1.7;font-size:16px">
      The market hasn't stood still. Sold prices have kept moving across sports cards, Pokémon, comics, and coins —
      and your specific items may have moved with them.
    </p>
    <p style="color:#444;line-height:1.7;font-size:16px">
      Coming back takes 30 seconds — same watchlist setup, same $9.99/month, 14 days free again.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resubscribeUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600">
        Restart my brief →
      </a>
    </div>
    <p style="color:#888;font-size:14px">This is the only email you'll get about this — no further follow-ups.</p>
    <p style="color:#888;font-size:14px">— The CollectrBrief team</p>
  </div>
</body>
</html>`;

  return sendBrief(toEmail, subject, html, null);
}
