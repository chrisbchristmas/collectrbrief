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
