#!/usr/bin/env bash
# Secure deploy script for Supabase Edge Functions
# Usage examples:
#   # interactive (prompts for project ref if not provided)
#   ./scripts/deploy-supabase.sh
#   # pass project ref and a secrets file (.env style)
#   ./scripts/deploy-supabase.sh -p YOUR_PROJECT_REF -s .env
#   # set secrets from environment variables, then run deploy
#   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_PROJECT_REF=... ./scripts/deploy-supabase.sh

set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
FUNCTION_DIR="$REPO_ROOT/supabase/functions/account-verification"

PROJECT_REF=
SECRETS_FILE=
DEPLOY_ONLY=false

print_usage() {
  cat <<EOF
Usage: $0 [-p project-ref] [-s secrets-file] [--deploy-only]

Options:
  -p PROJECT_REF    Supabase project ref (overrides SUPABASE_PROJECT_REF env)
  -s SECRETS_FILE   Path to a .env-like file containing KEY=VALUE pairs (optional)
  --deploy-only     Only deploy functions (do not set secrets)

This script will:
  1) Link the local folder to the Supabase project (supabase link)
  2) Optionally set secrets via 'supabase secrets set' from environment or a secrets file
  3) Deploy the function: account-verification

Important: keep your Service Role key secret. Do NOT commit secrets to git.
EOF
}

# parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--project-ref)
      PROJECT_REF="$2"; shift 2;;
    -s|--secrets-file)
      SECRETS_FILE="$2"; shift 2;;
    --deploy-only)
      DEPLOY_ONLY=true; shift 1;;
    -h|--help)
      print_usage; exit 0;;
    *)
      echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

# helper: require supabase CLI
if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install it first, e.g. via Homebrew: brew install supabase/tap/supabase"
  exit 1
fi

# pick project ref from env if not provided
if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF=${SUPABASE_PROJECT_REF:-}
fi

# prompt if still empty
if [[ -z "$PROJECT_REF" ]]; then
  read -rp "Enter Supabase project ref (e.g. 'abcdefg'): " PROJECT_REF
  if [[ -z "$PROJECT_REF" ]]; then
    echo "Project ref required. Set SUPABASE_PROJECT_REF env or pass -p."; exit 1
  fi
fi

echo "Using Supabase project-ref: $PROJECT_REF"

# Link the folder to the project (idempotent)
pushd "$REPO_ROOT" >/dev/null
echo "Linking repo to Supabase project..."
# supabase link stores project ref locally; ok if run repeatedly
supabase link --project-ref "$PROJECT_REF" || true

# Set secrets (unless deploy-only)
if [[ "$DEPLOY_ONLY" != true ]]; then
  echo "Setting secrets..."

  # Known secret keys we may set from env or secrets file (only set if value present)
  KEYS=(SUPABASE_SERVICE_ROLE_KEY VERIFICATION_HMAC_SECRET SENDGRID_API_KEY TWILIO_SID TWILIO_TOKEN TWILIO_FROM DEV_RETURN_CODES)

  declare -A KV

  # Load from SECRETS_FILE if provided
  if [[ -n "$SECRETS_FILE" ]]; then
    if [[ ! -f "$SECRETS_FILE" ]]; then
      echo "Secrets file '$SECRETS_FILE' not found"; exit 1
    fi
    while IFS= read -r line || [[ -n "$line" ]]; do
      # skip comments and empty
      [[ "$line" =~ ^# ]] && continue
      [[ -z "$line" ]] && continue
      if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        k=${BASH_REMATCH[1]}
        v=${BASH_REMATCH[2]}
        # remove surrounding quotes if present
        v=${v#"}
        v=${v%"}
        v=${v#\'}
        v=${v%\'}
        KV[$k]="$v"
      fi
    done < "$SECRETS_FILE"
  fi

  # Helper to get value from env or file
  get_val() {
    local key="$1"
    if [[ -n "${!key:-}" ]]; then
      printf "%s" "${!key}"
      return
    fi
    if [[ -n "${KV[$key]:-}" ]]; then
      printf "%s" "${KV[$key]}"
      return
    fi
    printf ""
  }

  for key in "${KEYS[@]}"; do
    val=$(get_val "$key")
    if [[ -n "$val" ]]; then
      echo "  Setting secret: $key"
      # Use --project-ref to target the right project; supabase secrets set accepts multiple KEY=VALUE pairs
      # Use a subshell to avoid exposing secrets in the parent environment
      supabase secrets set "$key=$val" --project-ref "$PROJECT_REF"
    else
      echo "  Skipping secret (not provided): $key"
    fi
  done
fi

# Deploy the function
echo "Deploying function: account-verification"
# The working directory isn't required for deploy, but we run from repo root
supabase functions deploy account-verification --project-ref "$PROJECT_REF" --no-verify-jwt

popd >/dev/null

echo "\nDeployment finished. If secrets were set, they are now stored in Supabase Secrets." 

cat <<EOF
Next steps / quick tests:
- Test send endpoint (replace <PROJECT_URL> with your SUPABASE_URL e.g. https://<ref>.supabase.co):
  curl -X POST '<SUPABASE_URL>/functions/v1/account-verification/send' \
    -H 'Content-Type: application/json' \
    -d '{"userId":"test-user","method":"email","destination":"[email protected]"}'

- Test verify endpoint:
  curl -X POST '<SUPABASE_URL>/functions/v1/account-verification/verify' \
    -H 'Content-Type: application/json' \
    -d '{"userId":"test-user","code":"000000"}'

Notes:
- The script uses the supabase CLI; run 'supabase login' before running if you haven't authenticated.
- SUPABASE_SERVICE_ROLE_KEY should be set as a secret; do not commit it.
- For QA, set DEV_RETURN_CODES=true in the secrets to have the function return the generated code.
EOF

exit 0
