#!/bin/bash

# Load environment variables
source .env.local

# Migration SQL
MIGRATION_SQL=$(cat migrations/0002_fix_schema_columns.sql)

echo "📡 Connecting to Supabase..."
echo "🔧 Applying migration to events table..."

# Use Supabase Management API to execute SQL
# Note: This uses the service role key and the pg-meta API
curl -X POST \
  "https://${SUPABASE_URL#https://}/rest/v1/rpc/exec" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}"

echo ""
echo "✅ Migration request sent"
echo ""
echo "⚠️  If this didn't work, please apply manually:"
echo "1. Go to: https://supabase.com/dashboard/project/jephwdsmehrmninpaggs/sql/new"
echo "2. Copy migrations/0002_fix_schema_columns.sql"
echo "3. Run it"
