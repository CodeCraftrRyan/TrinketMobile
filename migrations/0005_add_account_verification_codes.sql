-- Migration: create account_verification_codes table
-- Run with: psql $DATABASE_URL -f migrations/0005_add_account_verification_codes.sql

-- Ensure pgcrypto extension (provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store one-time verification codes for email / sms verification flows
CREATE TABLE IF NOT EXISTS public.account_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method text NOT NULL,
  destination text NOT NULL,
  hashed_code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  send_failed boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index to quickly look up the latest code for a user
CREATE INDEX IF NOT EXISTS idx_account_verification_codes_user_id_created_at ON public.account_verification_codes (user_id, created_at DESC);
