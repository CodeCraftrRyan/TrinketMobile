-- Migration: add stripe_webhook_events table for auditing Stripe webhook deliveries
-- Run with your usual migration tooling or via psql against the Supabase DB

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,
  event_type TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT
);
