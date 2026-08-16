-- CollectrBrief Database Schema
-- Neon Postgres (free tier)

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  niche       TEXT NOT NULL,           -- e.g. "sports cards", "pokemon", "vintage comics", "coins"
  watchlist   JSONB NOT NULL DEFAULT '[]',  -- array of { label, keywords } objects
  plan        TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing' | 'active' | 'canceled' | 'past_due'
  trial_ends_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- Briefs table — one row per weekly send per subscriber
CREATE TABLE IF NOT EXISTS briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  week_of         DATE NOT NULL,          -- Sunday of the week
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'generated' | 'sent' | 'failed'
  raw_data        JSONB,                  -- price data fetched from APIs
  generated_html  TEXT,                  -- final email HTML
  llm_commentary  TEXT,                  -- AI-written take
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Price snapshots — cached fetched price data per watchlist item
CREATE TABLE IF NOT EXISTS price_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords      TEXT NOT NULL,           -- normalized search terms
  source        TEXT NOT NULL,           -- 'cardhedge' | 'pricecharting' | 'ebay_active'
  data          JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_briefs_subscriber_week ON briefs(subscriber_id, week_of);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_keywords ON price_snapshots(keywords, source, fetched_at DESC);

-- === v2 additions (idempotent) ===

-- Week-over-week metrics per brief: { avgTotal, prevAvgTotal, wowPct, mover: {label, pct, dir} }
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS metrics JSONB;

-- Referral program: who referred this subscriber + their own shareable code
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES subscribers(id);
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS referral_credited BOOLEAN NOT NULL DEFAULT FALSE;

-- Public weekly market roundup pages (SEO), one per niche per week
CREATE TABLE IF NOT EXISTS market_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_slug  TEXT NOT NULL,            -- 'pokemon', 'sports-cards', ...
  week_of     DATE NOT NULL,
  html        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (niche_slug, week_of)
);

-- The public sample brief (regenerated weekly, one row per week)
CREATE TABLE IF NOT EXISTS sample_briefs (
  week_of     DATE PRIMARY KEY,
  html        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === v3 additions (idempotent) ===

-- Price alerts: subscriber sets a threshold on any watchlist item
CREATE TABLE IF NOT EXISTS price_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  keywords        TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('above','below')),
  threshold       NUMERIC(10,2) NOT NULL,
  triggered_at    TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_sub ON price_alerts(subscriber_id);

-- Personalized categories: which niches to include in brief (empty = all)
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS categories JSONB NOT NULL DEFAULT '[]';

-- === v4 additions (idempotent) ===

-- Free price-check tool leads (landing page lead magnet)
CREATE TABLE IF NOT EXISTS price_check_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,
  keywords    TEXT NOT NULL,
  result      JSONB,
  converted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_check_leads_email ON price_check_leads(email);

-- Trial nudge email tracking — prevents duplicate sends across cron ticks
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS trial_day3_sent_at TIMESTAMPTZ;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS trial_ending_sent_at TIMESTAMPTZ;

-- Public "Trending This Week" leaderboard page (SEO + shareable), regenerated weekly
CREATE TABLE IF NOT EXISTS trending_pages (
  week_of     DATE PRIMARY KEY,
  html        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- === v5 additions (idempotent) ===

-- Cancellation feedback: optional reason captured at unsubscribe time
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Win-back email tracking — 30 days post-cancellation, one-shot
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS winback_sent_at TIMESTAMPTZ;

