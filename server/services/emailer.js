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
