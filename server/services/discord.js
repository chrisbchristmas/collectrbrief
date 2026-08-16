// services/discord.js — Deliver instant price alerts to a subscriber's own
// Discord webhook. Zero infra cost: the subscriber provides the webhook URL,
// Discord hosts the delivery. URL format is validated at save time in
// routes/subscribers.js; this module just posts to it.

/**
 * Send a price alert to a Discord webhook as a rich embed.
 * Never throws — logs and returns false on failure so email delivery
 * (the primary channel) is unaffected.
 */
export async function sendDiscordAlert(webhookUrl, alert, currentAvg, dashUrl) {
  if (!webhookUrl) return false;

  const above = alert.direction === 'above';
  const embed = {
    title: `${above ? '📈' : '📉'} Price alert: ${alert.label}`,
    description: [
      `**Current 7-day avg:** $${Number(currentAvg).toLocaleString()}`,
      `**Your threshold:** ${above ? 'above' : 'below'} $${Number(alert.threshold).toLocaleString()}`,
      '',
      `[Open your dashboard](${dashUrl})`,
    ].join('\n'),
    color: above ? 0x16a34a : 0xdc2626,
    footer: { text: 'CollectrBrief · real sold-price data' },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'CollectrBrief', embeds: [embed] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[Discord] Webhook returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Discord] Alert delivery failed:', err.message);
    return false;
  }
}

/**
 * Send a test message so the subscriber can confirm their webhook works
 * right after saving it in preferences.
 */
export async function sendDiscordTest(webhookUrl) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CollectrBrief',
        embeds: [{
          title: '✅ Discord alerts connected',
          description: 'Price alerts for your watchlist will now arrive here the moment they trigger.',
          color: 0x1a1a1a,
          footer: { text: 'CollectrBrief' },
        }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
