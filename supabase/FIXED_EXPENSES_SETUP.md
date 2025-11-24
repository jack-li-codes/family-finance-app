# Fixed Expenses Setup Guide

This guide explains how to apply the fixed expenses migration and start using the configurable fixed expenses feature.

## Overview

The fixed expenses feature allows users to configure monthly recurring expenses that display on the `/accounts` page. Each user maintains their own list with Row Level Security (RLS) enforcing data isolation.

## Database Migration

### Step 1: Apply the Migration

1. Open your **Supabase Dashboard** (https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the migration file: `supabase/migrations/20250128000002_create_fixed_expenses.sql`
6. Copy the entire contents and paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 2: Verify Table Creation

Run this query to verify the table was created successfully:

```sql
-- Check if table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'fixed_expenses';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'fixed_expenses';
```

Expected output:
- Table `fixed_expenses` should exist
- `rowsecurity` should be `true`

### Step 3: Verify Seed Data

Check if seed data was inserted for your user:

```sql
-- Replace with your actual user_id
SELECT id, icon, name, amount, note, sort_order, is_active
FROM fixed_expenses
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY sort_order;
```

You should see 9 rows with the default fixed expenses (房贷, 汽车保险, etc.).

### Step 4: Verify Unique Index (for Template Import)

The migration includes a unique index on `(user_id, name)` to enable the "Import Template" feature:

```sql
-- Check if unique index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fixed_expenses'
  AND indexname = 'idx_fixed_expenses_user_name';
```

If the index is missing (e.g., you applied an older migration), run:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_fixed_expenses_user_name
  ON public.fixed_expenses(user_id, name);
```

Or apply the migration file: `supabase/migrations/20250128000003_add_unique_index_for_upsert.sql`

## Features

### User Interface Components

1. **Display Component** (`components/FixedExpenses.tsx`)
   - Shows on `/accounts` page in a yellow box
   - Displays active expenses sorted by `sort_order`
   - Shows totals grouped by currency
   - Includes "Manage" button to access admin page
   - Only section title uses i18n; expense data displays exactly as entered

2. **Admin CRUD Page** (`/fixed-expenses`)
   - Full CRUD operations (Create, Read, Update, Delete)
   - Inline form for adding/editing items
   - Soft delete by default (sets `is_active = false`)
   - Hard delete option (permanent removal)
   - Restore deleted items
   - Toast notifications for all operations
   - Bilingual UI with i18n support

### Data Model

```typescript
type FixedExpense = {
  id: bigint;                // Auto-generated
  user_id: uuid;             // References auth.users (auto-set)
  name: string;              // User-authored text (no i18n)
  amount: numeric;           // Monthly amount
  note: string;              // User-authored text (no i18n)
  icon: string;              // Optional emoji (e.g., "🏠")
  currency: string;          // Default "CAD"
  sort_order: int;           // Display order (default 0)
  is_active: boolean;        // Soft delete flag (default true)
  created_at: timestamptz;   // Auto-set
  updated_at: timestamptz;   // Auto-updated via trigger
}
```

### Default Seed Data

The migration automatically seeds these items for all existing users:

| Icon | Name | Amount | Note | Sort Order |
|------|------|--------|------|------------|
| 🏠 | 房贷 | 4482.28 | （每月28号） | 10 |
| 🚗 | 汽车保险 | 497.13 | （每月23号） | 20 |
| 🏡 | 房屋保险 | 208.02 | （每月23号） | 30 |
| 🚘 | 车 lease | 817.22 | （每月10号） | 40 |
| 📅 | 地税 | 1560 | （4月1次，6月25号） | 50 |
| 💡 | 水电 | 130 | （每月20号）≈ | 60 |
| 🔥 | 煤气 | 130 | （每月20号）≈ | 70 |
| 🌐 | 宽带 | 74 | （每月5号，LJS信用卡） | 80 |
| 📱 | 电话费 | 169.47 | （每月25号，JH信用卡） | 90 |

**Total:** CAD 8,068.12/month

## Usage Instructions

### For Users

1. **View Fixed Expenses**
   - Go to `/accounts` page
   - See the yellow "当前月份固定花销" box on the right
   - Toggle language (EN/中) to see title translation

2. **Manage Expenses**
   - Click **"管理"** (Manage) button in the yellow box
   - Or navigate to `/fixed-expenses` directly from the nav bar

3. **Import Template (Quick Setup)**
   - Click **"📥 一键导入模板"** (Import Template) button
   - If table already has data, confirm to overwrite/update
   - Imports 9 default fixed expense items:
     - 🏠 房贷: 4482.28 (每月28号)
     - 🚗 汽车保险: 497.13 (每月23号)
     - 🏡 房屋保险: 208.02 (每月23号)
     - 🚘 车 lease: 817.22 (每月10号)
     - 📅 地税: 1560 (4月1次，6月25号)
     - 💡 水电: 130 (每月20号)≈
     - 🔥 煤气: 130 (每月20号)≈
     - 🌐 宽带: 74 (每月5号，LJS信用卡)
     - 📱 电话费: 169.47 (每月25号，JH信用卡)
   - Uses upsert: updates existing records by name, inserts new ones
   - Success message: "导入成功" (Import successful)

4. **Add New Expense**
   - Click **"➕ 新增"** button
   - Fill in the form:
     - Icon: Optional emoji (e.g., 🏠, 🚗, 💡)
     - Name: Expense name (required, user-authored text)
     - Amount: Monthly amount (required, must be ≥ 0)
     - Currency: Select from CAD, USD, CNY, EUR
     - Note: Optional details (e.g., due dates, payment method)
     - Sort Order: Display order (lower numbers first)
     - Active: Checkbox to enable/disable
   - Click **"保存"** (Save)

5. **Edit Expense**
   - Click **"编辑"** (Edit) button on any row
   - Modify fields in the form
   - Click **"保存"** (Save)

6. **Delete Expense**
   - **Soft Delete**: Click **"删除"** (Delete) - sets `is_active = false`, can be restored
   - **Hard Delete**: Click **🗑️** icon - permanently removes record (cannot be undone)

7. **Restore Deleted Expense**
   - Deleted (inactive) items appear with gray background
   - Click **"恢复"** (Restore) to reactivate

### For Developers

#### Querying Fixed Expenses

```typescript
// Fetch active expenses only
const { data } = await supabase
  .from("fixed_expenses")
  .select("*")
  .eq("is_active", true)
  .order("sort_order", { ascending: true })
  .order("id", { ascending: true });

// Fetch all expenses (including deleted)
const { data } = await supabase
  .from("fixed_expenses")
  .select("*")
  .order("sort_order", { ascending: true });
```

#### Adding New Expense

```typescript
const { error } = await supabase
  .from("fixed_expenses")
  .insert({
    name: "New Expense",
    amount: 100.00,
    note: "Optional note",
    icon: "💰",
    currency: "CAD",
    sort_order: 100,
    is_active: true,
    // user_id auto-set by RLS
  });
```

#### Soft Delete

```typescript
const { error } = await supabase
  .from("fixed_expenses")
  .update({ is_active: false })
  .eq("id", expenseId);
```

## Security

### Row Level Security (RLS)

All operations are protected by RLS policies:

```sql
-- Users can only SELECT their own records
SELECT: auth.uid() = user_id

-- Users can only INSERT with their own user_id
INSERT: auth.uid() = user_id

-- Users can only UPDATE their own records
UPDATE: auth.uid() = user_id (both USING and WITH CHECK)

-- Users can only DELETE their own records
DELETE: auth.uid() = user_id
```

### Best Practices

1. **Never disable RLS** on the `fixed_expenses` table
2. **Don't manually set `user_id`** in client code - let RLS handle it
3. **Always filter by `is_active = true`** when displaying to users (unless showing deleted items)
4. **Use soft delete** by default to allow recovery
5. **Validate amounts** on both client and server (RLS does not validate data types)

## Internationalization (i18n)

### What's Translated

- ✅ Section title: "当前月份固定花销" → "Monthly Fixed Expenses"
- ✅ Admin page title: "固定花销管理" → "Fixed Expenses Management"
- ✅ Button labels: "保存" → "Save", "删除" → "Delete", etc.
- ✅ Table headers: "名称" → "Name", "金额" → "Amount", etc.

### What's NOT Translated

- ❌ Expense names (e.g., "房贷", "汽车保险") - stored as-is
- ❌ Notes (e.g., "（每月28号）") - stored as-is
- ❌ Icons (emojis are universal)

**Rationale**: Expense data is user-authored content that should be displayed exactly as entered, not translated automatically.

## Troubleshooting

### Issue: "Seed data not inserted"

**Solution**: The seed only runs if no records exist for the user. If you want to re-seed:

```sql
-- Delete existing records for your user (replace USER_ID)
DELETE FROM fixed_expenses WHERE user_id = 'YOUR_USER_ID';

-- Re-run the INSERT statement from the migration file
```

### Issue: "Table does not exist"

**Solution**: Make sure you ran the migration SQL in the correct database. Check:

```sql
SELECT current_database();
```

### Issue: "Permission denied"

**Solution**: Check if RLS policies are correctly applied:

```sql
-- View all policies on fixed_expenses
SELECT * FROM pg_policies WHERE tablename = 'fixed_expenses';
```

You should see 4 policies (SELECT, INSERT, UPDATE, DELETE).

### Issue: "Cannot see expenses on /accounts page"

**Solution**:
1. Check if table exists and has data
2. Check browser console for errors
3. Verify you're logged in (check Supabase auth session)
4. Try hard refresh (Cmd/Ctrl + Shift + R)

## Migration Rollback

If you need to remove the fixed expenses feature:

```sql
-- Drop table (cascades to remove policies and triggers)
DROP TABLE IF EXISTS public.fixed_expenses CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS public.update_fixed_expenses_updated_at() CASCADE;
```

⚠️ **Warning**: This will permanently delete all fixed expense data for all users!

## Next Steps

After applying the migration:

1. ✅ Verify seed data appears on `/accounts` page
2. ✅ Test language toggle (title should change, items should not)
3. ✅ Navigate to `/fixed-expenses` and test CRUD operations
4. ✅ Create a new expense, save, verify it appears on `/accounts`
5. ✅ Edit an expense, verify changes persist
6. ✅ Soft delete, verify item disappears from `/accounts`
7. ✅ Restore deleted item, verify it reappears

## Support

If you encounter issues:
- Check Supabase logs in Dashboard → Logs
- Check browser console for JavaScript errors
- Review RLS policies and ensure they're correctly applied
- Verify environment variables are set correctly

---

**Created**: 2025-01-28
**Migration File**: `supabase/migrations/20250128000002_create_fixed_expenses.sql`
**Version**: 1.0.0
