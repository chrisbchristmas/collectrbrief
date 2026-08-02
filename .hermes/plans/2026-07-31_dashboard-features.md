# CollectrBrief Dashboard Features — Implementation Plan

**Goal:** Add four zero-cost retention features: (1) Price Alerts, (2) Brief Archive + Trend Charts, (3) Collection Tracker, (4) Personalized Brief Categories — all served from the existing Neon PG / Express / React stack.

**Auth model:** Magic-link tokens (existing `verifyToken`/`signToken`) — no new auth system. Dashboard accessible via email link, same as Preferences.

**Data model additions:**
- `price_alerts` table — per-subscriber thresholds, direction, triggered flag
- `subscriber_categories` JSONB column — niches selected for personalized brief filtering
- Watchlist item `category` field (already JSONB, just a new key)

---

## Task 1: DB migrations — price_alerts table + categories column

**File:** `server/db/schema.sql` (append), `server/db/index.js` (migration runs on start)

```sql
-- Price alerts: user sets a threshold on a watchlist item
CREATE TABLE IF NOT EXISTS price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,          -- watchlist item label
  keywords        TEXT NOT NULL,
  direction       TEXT NOT NULL,          -- 'above' | 'below'
  threshold       NUMERIC(10,2) NOT NULL,
  triggered_at    TIMESTAMPTZ,            -- NULL = not yet triggered
  dismissed_at    TIMESTAMPTZ,            -- NULL = still active
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_sub ON price_alerts(subscriber_id);

-- Personalized categories: array of niche strings the subscriber wants in their brief
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]';
```

---

## Task 2: Server — Alert CRUD routes

**File:** `server/routes/alerts.js` (new)

Routes (all magic-link protected):
- `GET /api/alerts/:subscriberId` — list active alerts
- `POST /api/alerts/:subscriberId` — create alert `{ label, keywords, direction, threshold }`
- `DELETE /api/alerts/:subscriberId/:alertId` — dismiss/delete alert

Mount in `server/index.js`: `app.use('/api/alerts', alertsRouter)`

---

## Task 3: Server — Alert checking in brief engine

**File:** `server/services/briefEngine.js` (modify `generateBriefForSubscriber`)

After fetching price data, check each watchlist item's current avg against the subscriber's active alerts. If triggered, mark `triggered_at=NOW()` and queue an email notification.

---

## Task 4: Server — Brief history endpoint

**File:** `server/routes/subscribers.js` (add route)

`GET /api/subscribers/:id/history?token=` — returns last 12 briefs with `week_of`, `metrics`, `raw_data` (items + trend.avg only, stripped down). Used by the chart page.

---

## Task 5: Server — Categories PATCH

**File:** `server/routes/subscribers.js` (extend existing PATCH)

Add `categories` to the PATCH handler alongside `watchlist`/`niche`.

---

## Task 6: Client — Dashboard page (main hub)

**File:** `client/src/pages/Dashboard.jsx` (new)

Route: `/dashboard?id=<uuid>&token=<hmac>`

Sections:
1. **Collection value** — pulls latest brief metrics, shows portfolio block + WoW
2. **Price alerts** — lists alerts, add/remove form
3. **Brief archive** — list of past briefs with link to view each
4. **Trend charts** — recharts LineChart per watchlist item (avg price per week)
5. **Categories** — checkboxes for which niches to include in brief

---

## Task 7: Client — Route + nav wiring

**File:** `client/src/main.jsx` (add Dashboard route)
**File:** `client/src/pages/Preferences.jsx` (add "My Dashboard" link)
**File:** `server/services/briefEngine.js` (add dashboard URL to email footer)

---

## Task 8: Brief engine — categories filter

**File:** `server/services/briefEngine.js` — `fetchWatchlistData`

If `subscriber.categories` is non-empty array, filter watchlist items to only those whose `category` field matches one of the subscriber's selected categories. Fallback: include all if categories empty.

---

## Task 9: Alert email notification

**File:** `server/services/emailer.js` (add `sendAlertNotification`)

Simple transactional email: "Your [label] just crossed $[threshold]" with link to dashboard.

---

## Task 10: Deploy — push to Render

`git add . && git commit -m "feat: dashboard, alerts, history charts, collection tracker, categories" && git push`

Render auto-deploys on push to master.
