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
