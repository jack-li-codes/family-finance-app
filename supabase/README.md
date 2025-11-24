# Supabase Database Configuration

This directory contains SQL migrations and seed data for the Family Finance App.

## Directory Structure

```
supabase/
├── README.md                                    # This file
├── migrations/
│   └── 20250128000001_enable_rls_policies.sql  # RLS policies for all tables
└── demo_seed.sql                                # Demo data for testing
```

## 🔒 Row Level Security (RLS) Policies

### What is RLS?

Row Level Security ensures that users can only access their own data at the database level. Even if client-side code is bypassed, the database will enforce access controls.

### Applying RLS Policies

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `migrations/20250128000001_enable_rls_policies.sql`
5. Paste and click **Run**

**Option 2: Via Supabase CLI**

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

### What the RLS Migration Does

The migration file `20250128000001_enable_rls_policies.sql`:

✅ Enables RLS on all tables:
- `accounts`
- `transactions`
- `projects`
- `worklogs`

✅ Creates policies for each table:
- **SELECT**: Users can only view their own rows (`user_id = auth.uid()`)
- **INSERT**: Users can only insert rows with their own `user_id`
- **UPDATE**: Users can only update their own rows
- **DELETE**: Users can only delete their own rows

✅ Is idempotent:
- Safe to run multiple times
- Drops and recreates policies if they already exist

### Verifying RLS is Enabled

Run this query in Supabase SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('accounts', 'transactions', 'projects', 'worklogs');
```

All tables should show `rowsecurity = true`.

### Viewing Active Policies

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('accounts', 'transactions', 'projects', 'worklogs')
ORDER BY tablename, policyname;
```

## 🌱 Demo Seed Data

### Purpose

The `demo_seed.sql` file creates sample data for testing the multi-user functionality of the app.

### What's Included

- **2 Demo Users** with complete financial data
- **7 Accounts** (4 for User 1, 3 for User 2)
- **4 Projects** (2 per user)
- **15 Transactions** (9 for User 1, 6 for User 2)
- **9 Worklogs** (5 for User 1, 4 for User 2)

### Using the Seed File

**Step 1: Create Demo Users**

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Create two users:
   - Email: `demo1@example.com` | Password: `Demo123!@#`
   - Email: `demo2@example.com` | Password: `Demo456!@#`
4. **Copy each user's UUID** from the users list

**Step 2: Update Seed File**

1. Open `demo_seed.sql`
2. Find lines 27-28:
   ```sql
   demo_user_1 UUID := 'USER_1_UUID_HERE';
   demo_user_2 UUID := 'USER_2_UUID_HERE';
   ```
3. Replace `USER_1_UUID_HERE` with demo1@example.com's UUID
4. Replace `USER_2_UUID_HERE` with demo2@example.com's UUID

**Step 3: Run Seed File**

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the **entire contents** of `demo_seed.sql`
4. Paste and click **Run**

**Step 4: Verify**

Run these queries to confirm data was inserted:

```sql
-- Check accounts per user
SELECT user_id, COUNT(*) as account_count FROM accounts GROUP BY user_id;

-- Check transactions per user
SELECT user_id, COUNT(*) as transaction_count FROM transactions GROUP BY user_id;

-- Check projects per user
SELECT user_id, COUNT(*) as project_count FROM projects GROUP BY user_id;

-- Check worklogs per user
SELECT user_id, COUNT(*) as worklog_count FROM worklogs GROUP BY user_id;
```

### Testing Multi-User Isolation

1. Log in to the app as `demo1@example.com`
   - You should see 4 accounts, 9 transactions, etc.
2. Log out and log in as `demo2@example.com`
   - You should see completely different data (3 accounts, 6 transactions)
3. Each user's data is completely isolated thanks to RLS

### Cleaning Up Demo Data

To remove all demo data, uncomment and run the cleanup section at the bottom of `demo_seed.sql`:

```sql
DO $$
DECLARE
  demo_user_1 UUID := 'YOUR_DEMO_USER_1_UUID';
  demo_user_2 UUID := 'YOUR_DEMO_USER_2_UUID';
BEGIN
  DELETE FROM worklogs WHERE user_id IN (demo_user_1, demo_user_2);
  DELETE FROM transactions WHERE user_id IN (demo_user_1, demo_user_2);
  DELETE FROM projects WHERE user_id IN (demo_user_1, demo_user_2);
  DELETE FROM accounts WHERE user_id IN (demo_user_1, demo_user_2);

  RAISE NOTICE 'Demo data cleaned up successfully';
END $$;
```

## 📋 Migration Checklist

Use this checklist when setting up RLS for the first time:

- [ ] Backup your database (if you have production data)
- [ ] Review the RLS migration file
- [ ] Apply RLS migration via SQL Editor
- [ ] Verify RLS is enabled on all tables
- [ ] Test that existing client-side queries still work
- [ ] (Optional) Create demo users for testing
- [ ] (Optional) Apply demo seed data
- [ ] Test multi-user isolation
- [ ] Update CLAUDE.md to reflect RLS implementation

## ⚠️ Important Notes

### Before Enabling RLS

- **Backup your data**: RLS is a significant security change
- **Test thoroughly**: Ensure all app features work after enabling RLS
- **Service roles**: RLS policies don't apply to service role keys (only anon/authenticated keys)

### After Enabling RLS

- ✅ All client-side queries will be automatically filtered by `user_id`
- ✅ Users cannot access other users' data even if client code is manipulated
- ✅ Database-level security ensures data isolation
- ❌ Service role queries bypass RLS (use carefully!)

### Common Issues

**Issue**: "No rows returned after enabling RLS"
- **Cause**: Existing data doesn't have `user_id` set
- **Fix**: Update existing rows to set proper `user_id` values

**Issue**: "Permission denied for table X"
- **Cause**: RLS policy not created or incorrect
- **Fix**: Re-run migration, check policy syntax

**Issue**: "Cannot insert row - violates RLS policy"
- **Cause**: Client trying to insert with wrong `user_id`
- **Fix**: Ensure `user_id` is set to `auth.uid()` in INSERT queries

## 🔗 References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

## 🚀 Next Steps

After setting up RLS:

1. **Update CLAUDE.md** to document that RLS is now enabled
2. **Test all app features** with multiple users
3. **Remove client-side filters** (optional - RLS now handles this, but client filters improve performance)
4. **Monitor database logs** for any RLS policy violations
5. **Add more granular policies** if needed (e.g., sharing between family members)

---

For questions or issues, refer to the main project documentation in `/CLAUDE.md`.
