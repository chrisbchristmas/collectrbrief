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
Format: For each item, start with the item name in bold on its own line (e.g. **PSA 10 Charizard Base Set**), then 2-4 sentences, then end the section with "Signal: BUY", "Signal: HOLD" or "Signal: WATCH" on its own line. Use plain paragraphs — no markdown headings (#), no bullet lists, no tables.
Cite the actual numbers you are given (avg, week-over-week %, grading premium, marketplace spread). If an item has zero sales, say so in one sentence and signal WATCH — never invent prices.
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

/**
 * Convert LLM commentary (light markdown) into safe inline-styled HTML for
 * emails and public pages. Handles headings, bold, bullets, paragraphs, and
 * renders a coloured badge for the trailing BUY / HOLD / WATCH signal.
 * Shared by briefEngine + publicContent so every surface looks identical.
 */
export function formatCommentary(text, { dark = true } = {}) {
  if (!text) return '';
  const fg = dark ? '#e8e4dc' : '#1a1a1a';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const badge = sig => {
    const c = { BUY: '#16a34a', HOLD: '#6b7280', WATCH: '#d97706' }[sig];
    return `<span style="display:inline-block;background:${c};color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:4px;margin-left:6px;vertical-align:middle">${sig}</span>`;
  };
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/(?:Signal:\s*)?\b(BUY|HOLD|WATCH)\b\.?\s*$/i, (_, sig) => badge(sig.toUpperCase()))
    .replace(/\bSignal:\s*\b(BUY|HOLD|WATCH)\b/gi, (_, sig) => badge(sig.toUpperCase()));

  const blocks = String(text).replace(/\r/g, '').trim().split(/\n{2,}/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let bullets = [];
    const flushBullets = () => {
      if (!bullets.length) return;
      out.push(`<ul style="margin:0 0 14px 18px;padding:0;color:${fg};line-height:1.7;font-size:15px">` +
        bullets.map(b => `<li>${inline(b)}</li>`).join('') + '</ul>');
      bullets = [];
    };
    for (const line of lines) {
      const b = line.match(/^[-*•]\s+(.+)$/);
      if (b) { bullets.push(b[1]); continue; }
      flushBullets();
      const h = line.match(/^(#{1,4})\s+(.+)$/);
      if (h) {
        out.push(`<h3 style="margin:18px 0 6px;font-size:16px;color:${fg}">${inline(h[2].replace(/^\*\*|\*\*$/g, ''))}</h3>`);
        continue;
      }
      // "**Item name**" alone on a line acts as a heading
      const boldOnly = line.match(/^\*\*([^*]+)\*\*:?$/);
      if (boldOnly) {
        out.push(`<h3 style="margin:18px 0 6px;font-size:16px;color:${fg}">${esc(boldOnly[1])}</h3>`);
        continue;
      }
      out.push(`<p style="margin:0 0 12px;color:${fg};line-height:1.7;font-size:15px">${inline(line)}</p>`);
    }
    flushBullets();
  }
  return out.join('');
}

function buildUserPrompt(subscriber, itemResults) {
  const weekOf = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lines = itemResults.map(item => {
    const { label, trend, sales, insights, pcData } = item;
    const topSales = sales.slice(0, 5).map(s =>
      `  - ${s.title} → $${s.price} on ${s.source} (${s.date ? new Date(s.date).toLocaleDateString() : 'recent'})`
    ).join('\n');
    const wow = typeof trend.wowPct === 'number'
      ? `Week-over-week: ${trend.wowPct >= 0 ? '+' : ''}${trend.wowPct}% (prior week avg $${trend.prevAvg}, ${trend.prevCount} sales)`
      : `In-window momentum: ${trend.pctChange >= 0 ? '+' : ''}${trend.pctChange}% (newer vs older sales this week; no prior-week history yet)`;
    const extras = [];
    if (insights?.gradingPremium) {
      const g = insights.gradingPremium;
      extras.push(`Grading premium: ${g.highGrade} avg $${g.highAvg} vs ${g.lowGrade} avg $${g.lowAvg} (+${g.premiumPct}%)`);
    }
    if (insights?.marketplaceSpread) {
      const m = insights.marketplaceSpread;
      extras.push(`Marketplace spread: ${m.highSource} avg $${m.highAvg} vs ${m.lowSource} avg $${m.lowAvg} (${m.spreadPct}% gap)`);
    }
    { const pcRef = pcData?.prices?.graded ?? pcData?.prices?.ungraded; if (pcRef) extras.push(`PriceCharting reference: $${pcRef}`); }
    return `ITEM: ${label}
Trend: ${trend.trend} | Avg: $${trend.avg} | Median: $${trend.median ?? trend.avg} | Range: $${trend.min}–$${trend.max} | ${trend.count} sales this week
${wow}${extras.length ? '\n' + extras.join('\n') : ''}
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
