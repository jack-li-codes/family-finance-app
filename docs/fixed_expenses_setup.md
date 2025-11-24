# Fixed Expenses Setup Guide

## Quick Start

Before using the **"一键导入模板"** (Import Template) feature in `/fixed-expenses`, you need to run a one-time setup script in your Supabase database.

## Setup Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Setup Script

1. Open the file: `supabase/sql/fixed_expenses_setup.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press `Cmd/Ctrl + Enter`)

### Step 3: Verify Success

You should see a success message:
```
✓ Fixed Expenses Setup Complete!
  - Table: public.fixed_expenses
  - Unique Index: fixed_expenses_name_key
  - RLS: Enabled with 4 policies
  - Trigger: update_fixed_expenses_updated_at
```

## What This Script Does

The setup script creates:

1. **Table**: `public.fixed_expenses`
   - Stores your monthly fixed expense items
   - Fields: id, icon, name, amount, note, currency, sort_order, is_active

2. **Unique Index**: `fixed_expenses_name_key` on `name` column
   - Required for the Import Template upsert operation
   - Prevents duplicate expense names
   - Enables "update if exists, insert if new" behavior

3. **Row Level Security (RLS) Policies**:
   - `fe_select_all`: Anyone can read expenses (public read)
   - `fe_insert_auth`: Authenticated users can create expenses
   - `fe_update_auth`: Authenticated users can update expenses
   - `fe_delete_auth`: Authenticated users can delete expenses

4. **Auto-Update Trigger**: Updates `updated_at` timestamp automatically

## Using the Import Template Feature

Once setup is complete:

1. Navigate to `/fixed-expenses` page
2. Click **"📥 一键导入模板"** (Import Template)
3. The system will upsert 9 default expense items:
   - 🏠 房贷: 4482.28 (每月28号)
   - 🚗 汽车保险: 497.13 (每月23号)
   - 🏡 房屋保险: 208.02 (每月23号)
   - 🚘 车 lease: 817.22 (每月10号)
   - 📅 地税: 1560 (4月1次，6月25号)
   - 💡 水电: 130 (每月20号)≈
   - 🔥 煤气: 130 (每月20号)≈
   - 🌐 宽带: 74 (每月5号，LJS信用卡)
   - 📱 电话费: 169.47 (每月25号，JH信用卡)

4. Imported items will appear on:
   - `/fixed-expenses` admin page (full CRUD)
   - `/accounts` page (yellow summary card)

## Troubleshooting

### Error: "no unique or exclusion constraint"

**Cause**: The unique index `fixed_expenses_name_key` is missing.

**Solution**: Re-run the setup script. The index creation line is:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS fixed_expenses_name_key
  ON public.fixed_expenses (name);
```

### Error: "violates row-level security policy"

**Cause**: RLS policies are not configured correctly.

**Solution**: Re-run the setup script. It will drop and recreate all 4 policies.

### Error: "relation does not exist"

**Cause**: The `fixed_expenses` table hasn't been created.

**Solution**: Run the full setup script from `supabase/sql/fixed_expenses_setup.sql`.

### Import Button Shows Warning

If you see a gray hint above the Import button:
- **"提示：首次使用前请在 Supabase 运行 SQL..."**
  - This means the table is empty or not set up
  - Run the setup script as described above

### Verify Setup Manually

Run this query in Supabase SQL Editor to check your setup:

```sql
-- Check table exists
SELECT COUNT(*) as row_count FROM public.fixed_expenses;

-- Check unique index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fixed_expenses'
  AND indexname = 'fixed_expenses_name_key';

-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'fixed_expenses';
```

Expected results:
- Table query should return a count (0 or more)
- Index query should return 1 row with the index definition
- Policies query should return 4 rows (SELECT, INSERT, UPDATE, DELETE)

## Re-running the Script

The setup script is **idempotent** - you can safely run it multiple times:
- `CREATE TABLE IF NOT EXISTS` - won't recreate if exists
- `CREATE UNIQUE INDEX IF NOT EXISTS` - won't recreate if exists
- `DROP POLICY IF EXISTS` before `CREATE POLICY` - ensures clean state
- Existing data is preserved

## Next Steps

After successful setup:
1. ✅ Test Import Template feature
2. ✅ Verify expenses appear in admin list
3. ✅ Check yellow card on `/accounts` page
4. ✅ Try editing/deleting expenses
5. ✅ Toggle language to verify i18n (title only, not items)

## Support

If you encounter issues not covered here:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for detailed error messages
3. Verify you're logged in (authentication required for insert/update/delete)

---

**Setup File Location**: `supabase/sql/fixed_expenses_setup.sql`
**Last Updated**: 2025-01-28
