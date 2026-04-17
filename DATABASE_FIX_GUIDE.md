# Database Schema Fix - Application Guide

## Issue Summary
The app code was referencing columns that might not exist in the database:
- `items.title` → Should be `items.name`
- `events.photo_url` → May not exist (needs to be added)

## What Was Fixed

### Code Changes ✅
1. **app/(tabs)/items/[id].tsx** - Changed `item.title` to `item.name || item.title` (fallback for compatibility)
2. **app/(tabs)/home.tsx** - Changed query from `title` to `name` and display to use `name || title || 'Untitled'`

### Database Migration Created
**File:** `migrations/0002_fix_schema_columns.sql`

This migration will:
- Add `photo_url` column to `events` table if it doesn't exist
- Add helpful comments to document the schema

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Easiest)
1. Go to your Supabase project: https://supabase.com/dashboard/project/jephwdsmehrmninpaggs
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the contents of `migrations/0002_fix_schema_columns.sql`
5. Click "Run" or press Cmd+Enter

### Option 2: Using Supabase CLI (If Docker is running)
```bash
# Start Docker Desktop first, then:
supabase db push
```

### Option 3: Manual SQL (If you have psql or another SQL client)
```bash
psql "postgresql://postgres:Z7aIWPP2EXt0sdMC@db.jephwdsmehrmninpaggs.supabase.co:5432/postgres"

# Then paste the migration SQL
```

## Verification

After applying the migration, verify it worked:

### Check in Supabase Dashboard
1. Go to "Table Editor"
2. Select "events" table
3. Verify `photo_url` column exists

### Test in the App
```bash
npm run ios
```

Check that:
- ✅ Item detail page shows the item name correctly
- ✅ Home page "Recently Viewed" shows item names
- ✅ Events page loads without SQL errors
- ✅ Calendar search works without errors

## Expected Behavior After Fix

**Before:** Console warnings like:
```
Failed to load items ... column items.title does not exist
Failed to load events ... column events.photo_url does not exist
```

**After:** No SQL errors, items and events load correctly

## Rollback (If Needed)

If something goes wrong, you can rollback the `photo_url` column:
```sql
ALTER TABLE events DROP COLUMN IF EXISTS photo_url;
```

(But this is unlikely to cause issues since we're only adding a column, not modifying existing data)

---

**Current Status:**
- ✅ Code updated to use correct column names
- ✅ TypeScript compiles
- ✅ ESLint passes
- ⏳ Migration SQL created (needs to be applied to database)

**Next Step:** Apply the migration using one of the options above!
