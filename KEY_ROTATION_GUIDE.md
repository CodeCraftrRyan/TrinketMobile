# 🔐 API Key Rotation Guide

Your API keys were previously committed to git and need to be rotated for security.

## Keys That Need Rotation

### 1. OpenAI API Key ⚠️ HIGH PRIORITY
**Current Key (compromised):** `sk-proj-BQABH6Jr7pROgHc...` (in git history)

**Steps to Rotate:**
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it: "TrinketMobile Production"
4. Copy the new key
5. **IMMEDIATELY** delete the old key: `sk-proj-BQABH6Jr7pROgHc...`
6. Update `.env.local` with the new key

**After rotation, run:**
```bash
# Update your local env
# Then test that everything still works
npm run ios
```

---

### 2. Stripe Secret Key (Test Mode) ⚠️ MEDIUM PRIORITY
**Current Key (compromised):** `sk_test_51SjsfiBe0Ip8ncqm...` (in git history)

**Steps to Rotate:**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Create secret key" (or reveal the restricted keys section)
3. Roll/Delete the old test key: `sk_test_51SjsfiBe0Ip8ncqm...`
4. Copy your new test secret key
5. Update `.env.local` with new `STRIPE_SECRET_KEY`
6. Also rotate the publishable key if you want (less critical but good practice)

**Note:** These are TEST mode keys, so less critical than production, but still rotate them.

---

### 3. Stripe Publishable Key (Test Mode) 🔵 LOW PRIORITY
**Current Key:** `pk_test_51SjsfiBe0Ip8ncqm...`

This key is less sensitive (it's meant to be public in your frontend), but rotate for completeness:
1. In Stripe dashboard, this will auto-update when you rotate the secret key
2. Update `.env.local` with the new publishable key

---

### 4. Supabase Service Role Key ⚠️ CANNOT ROTATE EASILY
**Current Key (compromised):** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Options:**
- **Option A (Recommended but nuclear):** Create a new Supabase project and migrate data
- **Option B (Security measure):** Enable RLS policies on all tables to limit what service role can do
- **Option C (Monitor):** Enable Supabase audit logs and monitor for suspicious activity

**For now:** Add RLS policies to protect your data even if the key is compromised.

**To check current RLS status:**
```bash
# Check if you have Supabase CLI installed
supabase --version

# If installed, you can inspect your database
supabase db pull
```

---

### 5. Database Connection String ⚠️ MEDIUM PRIORITY
**Current:** Contains password `Z7aIWPP2EXt0sdMC`

**To rotate:**
1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Copy new password
4. Update `DATABASE_URL` in `.env.local` with new password

---

## After Rotation Checklist

- [ ] Test local app still works: `npm run ios`
- [ ] Update Supabase Edge Functions secrets (for deployed functions)
- [ ] Update any CI/CD environment variables
- [ ] Document the rotation date: `January 18, 2026`

---

## Prevention for Future

✅ **Already done:**
- `.env.local` is now gitignored
- `.env` is now a template without secrets

🔒 **Additional measures:**
1. Enable git pre-commit hooks to scan for secrets
2. Use a secrets manager (e.g., 1Password, AWS Secrets Manager) for team projects
3. Regularly rotate keys every 90 days

---

## Quick Commands

```bash
# 1. After getting new keys, edit .env.local
nano .env.local  # or use your preferred editor

# 2. Test that the app loads
npm run ios

# 3. Check for any API errors in logs
# Watch the Metro bundler output

# 4. Commit the .env template change
git add .env
git commit -m "security: remove secrets from .env, add template"
git push
```

---

**Need help?** The agent can help update `.env.local` once you have the new keys!
