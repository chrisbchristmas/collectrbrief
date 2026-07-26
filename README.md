# CollectrBrief

Personalized weekly market intelligence for collectors. Every Sunday: sold prices for your specific items across eBay, Heritage & Fanatics, trend direction, and an AI-written buy/hold/watch take.

## Stack

| Layer | Tech |
|---|---|
| API server | Node.js 24 + Express |
| Database | Neon Postgres (free tier) |
| Payments | Stripe (subscriptions + webhooks) |
| Email | SendGrid (free → Essentials) |
| Price data | CardHedge API ($0.01/call) + PriceCharting API ($4.99/mo) |
| AI commentary | OpenAI-compatible (gpt-4o-mini or any Ollama model) |
| Frontend | React 18 + Vite |
| Cron | node-cron (Sunday 8am) |

## Quick Start

### 1. Server

```bash
cd server
cp .env.example .env
# Fill in DATABASE_URL, STRIPE_*, SENDGRID_API_KEY, CARDHEDGE_API_KEY, PRICECHARTING_API_KEY, OPENAI_API_KEY
npm install
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm run dev
# Opens at http://localhost:5173
```

### 3. Smoke test (no API keys needed)

```bash
cd server
node smoke-test.js
```

## Env vars

See `server/.env.example` for all required variables.

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✓ | Neon Postgres connection string |
| `STRIPE_SECRET_KEY` | ✓ prod | `sk_test_...` for dev |
| `STRIPE_PRICE_ID` | ✓ prod | Your $9.99/mo recurring price ID |
| `STRIPE_WEBHOOK_SECRET` | ✓ prod | From Stripe dashboard |
| `SENDGRID_API_KEY` | ✓ prod | Free tier: 100 emails/day |
| `CARDHEDGE_API_KEY` | ✓ prod | api.cardhedger.com — $0.01/call |
| `PRICECHARTING_API_KEY` | prod | $4.99/mo — optional supplement |
| `OPENAI_API_KEY` | ✓ prod | Or set `LLM_BASE_URL` for Ollama |
| `ADMIN_KEY` | ✓ | Random string for `/api/admin` endpoints |
| `CLIENT_ORIGIN` | ✓ | e.g. `https://collectrbrief.com` |

## API endpoints

```
POST   /api/subscribers              — sign up + start Stripe checkout
GET    /api/subscribers/:id          — get subscriber (prefs page)
PATCH  /api/subscribers/:id          — update watchlist/niche
DELETE /api/subscribers/:id/unsubscribe

POST   /api/webhooks/stripe          — Stripe event handler

GET    /api/admin/stats              — subscriber + brief stats
GET    /api/admin/subscribers        — subscriber list
POST   /api/admin/trigger-brief      — manually run briefs { subscriber_id? }
GET    /api/admin/preview-brief/:id  — preview brief HTML in browser
```

Admin endpoints require `X-Admin-Key` header matching `ADMIN_KEY`.

## Costs at scale

| Stage | Monthly cost |
|---|---|
| 0–100 subs | ~$13 (Render $7 + PriceCharting $5 + LLM ~$1) |
| 100–500 subs | ~$340 (+ SendGrid $20 + CardHedge ~$300 at 15 items × 500 subs) |
| Revenue @ 500 × $9.99 | $4,995 |

## Deployment (Render)

1. Push to GitHub
2. Create a Render Web Service pointing at `/server`
3. Set all env vars in Render dashboard
4. Build command: `npm install`; Start command: `node index.js`
5. Add a Static Site for `/client/dist` or deploy to Vercel/Netlify

## Development notes

- All services degrade gracefully with no API keys — mock data returned
- Brief engine: CardHedge (sold data) + PriceCharting (reference prices) run in parallel per watchlist item
- LLM model is swappable — set `LLM_BASE_URL=http://localhost:11434/v1` + `LLM_MODEL=llama3.2` for local Ollama
- Admin preview endpoint (`/api/admin/preview-brief/:id`) renders the email HTML directly in browser for QA
