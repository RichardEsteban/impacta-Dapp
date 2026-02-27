-- SME Escrow MVP — Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Escrow status enum
CREATE TYPE escrow_status AS ENUM (
  'pending',
  'funded',
  'delivered',
  'released',
  'refunded',
  'disputed'
);

-- Main escrows table
CREATE TABLE IF NOT EXISTS escrows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_address      TEXT NOT NULL,
  buyer_address       TEXT,
  escrow_public_key   TEXT NOT NULL,
  escrow_secret_key   TEXT NOT NULL,  -- encrypted in production; plaintext for MVP testnet
  amount_xlm          NUMERIC(20, 7) NOT NULL,
  description         TEXT NOT NULL,
  status              escrow_status NOT NULL DEFAULT 'pending',
  deadline_days       INTEGER NOT NULL DEFAULT 7,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  funded_at           TIMESTAMPTZ,
  payment_link        TEXT,
  -- Optional: track TX hashes for auditability
  fund_tx_hash        TEXT,
  release_tx_hash     TEXT,
  refund_tx_hash      TEXT
);

-- Index for quick seller lookups (dashboard queries)
CREATE INDEX idx_escrows_seller ON escrows (seller_address);
-- Index for buyer lookups
CREATE INDEX idx_escrows_buyer ON escrows (buyer_address);
-- Index for status filtering
CREATE INDEX idx_escrows_status ON escrows (status);

-- Row Level Security: allow service role full access
-- For MVP we use the service role key in API routes, so no user-level RLS needed.
-- Enable RLS (optional hardening for future):
-- ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
