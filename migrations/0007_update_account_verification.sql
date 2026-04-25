-- migration: add hashed code, attempts and max_attempts to account_verification_codes
ALTER TABLE IF EXISTS account_verification_codes
  ADD COLUMN IF NOT EXISTS code_hash text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- optional: keep the plaintext code column for compatibility for now; future migration can remove it
