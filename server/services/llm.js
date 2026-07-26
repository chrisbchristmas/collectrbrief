// services/llm.js — OpenAI-compatible LLM for brief commentary
// Uses the OPENAI_API_KEY env var; swap base URL for Ollama locally

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

/**
 * Generate a Buy / Hold / Watch commentary for a subscriber's watchlist.
 * @param {Object} subscriber - { first_name, niche, watchlist }
 * @param {Array}  itemResults - [{ label, keywords, sales, trend, pcData }]
 * @returns {string} HTML commentary block
 */
export async function generateCommentary(subscriber, itemResults) {
  const systemPrompt = `You are CollectrBrief — a sharp, concise market intelligence writer for serious collectors. 
Your job: analyse sold auction data for a subscriber's watchlist and deliver a punchy weekly take.
Tone: confident, direct, data-first. No fluff. No disclaimers. No "it depends."
Format: For each item, write 2-4 sentences. End with a clear one-word signal: BUY, HOLD, or WATCH.
BUY = prices are trending down and it's a good entry point, or supply is thin and demand is up.
HOLD = prices are stable; no reason to act.
WATCH = mixed signals or a notable event worth tracking.`;

  const userPrompt = buildUserPrompt(subscriber, itemResults);

  if (!API_KEY) {
    console.warn('[LLM] No API key — returning mock commentary');
    return getMockCommentary(itemResults);
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

function buildUserPrompt(subscriber, itemResults) {
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lines = itemResults.map(item => {
    const { label, trend, sales } = item;
    const topSales = sales.slice(0, 5).map(s =>
      `  - ${s.title} → $${s.price} on ${s.source} (${s.date ? new Date(s.date).toLocaleDateString() : 'recent'})`
    ).join('\n');
    return `ITEM: ${label}
Trend: ${trend.trend} | Avg: $${trend.avg} | Range: $${trend.min}–$${trend.max} | ${trend.count} sales this week
Recent sales:
${topSales || '  (no sales data)'}`;
  }).join('\n\n');

  return `Week of ${weekOf}
Subscriber: ${subscriber.first_name || 'Collector'} | Niche: ${subscriber.niche}

${lines}

Write your weekly take. One section per item. End each with BUY, HOLD, or WATCH.`;
}

function getMockCommentary(itemResults) {
  return itemResults.map(item => {
    const signals = ['BUY', 'HOLD', 'WATCH'];
    const signal = signals[Math.floor(Math.random() * signals.length)];
    return `<p><strong>${item.label}</strong> — ${item.trend.count} sales this week averaging $${item.trend.avg}. ` +
      `Prices are ${item.trend.trend} with a range of $${item.trend.min}–$${item.trend.max}. ` +
      `This is mock commentary generated without an LLM API key. Signal: <strong>${signal}</strong></p>`;
  }).join('\n');
}
