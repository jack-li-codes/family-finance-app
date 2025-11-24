# Family Finance App - Project Overview

This is a Next.js 15 (App Router) + Supabase personal finance tracking application with bilingual support (Chinese/English). Currently designed for single-family use.

## Project Structure

```
family-finance-app/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx       # Email/password authentication
│   ├── account-overview/page.tsx # Monthly balance evolution charts
│   ├── accounts/page.tsx        # CRUD for bank/credit accounts
│   ├── balance/
│   │   ├── page.tsx
│   │   └── BalanceContent.tsx   # Current account balances snapshot
│   ├── hooks/
│   │   └── useLocalStorage.ts   # Language preference storage
│   ├── projects/page.tsx        # Project management (for worklogs)
│   ├── summary/page.tsx         # Monthly expense/income breakdown
│   ├── transactions/page.tsx    # CRUD for income/expense transactions
│   ├── worklog/page.tsx         # Work hours tracking by project
│   ├── i18n.ts                  # Translation dictionary (zh/en)
│   ├── i18n-context.tsx         # Language context provider
│   ├── layout.tsx               # Root layout with navigation
│   ├── page.tsx                 # Home/landing page
│   ├── types.ts                 # TypeScript type definitions
│   └── globals.css
├── components/
│   ├── AuthGuard.tsx            # Client-side auth wrapper component
│   └── FixedExpenses.tsx        # Generic fixed expenses placeholder
├── lib/
│   └── supabase.ts              # Supabase browser client singleton
├── supabase/                    # ✨ NEW: Database migrations & seeds
│   ├── README.md                # Complete RLS setup guide
│   ├── migrations/
│   │   └── 20250128000001_enable_rls_policies.sql  # RLS policies for all tables
│   └── demo_seed.sql            # Demo data for multi-user testing
├── .env.local                   # Supabase credentials
├── package.json
├── tsconfig.json
├── next.config.ts
└── supabase-schema.md           # Partial database documentation
```

## 🔒 Supabase Row Level Security (RLS) Setup

### Status: Ready to Apply

Row Level Security policies have been prepared but **not yet applied** to the database. The migration files are ready in the `supabase/` directory.

### What's Included

📁 **`supabase/migrations/20250128000001_enable_rls_policies.sql`**
- Enables RLS on all 4 tables: `accounts`, `transactions`, `projects`, `worklogs`
- Creates policies for SELECT, INSERT, UPDATE, DELETE operations
- Enforces `user_id = auth.uid()` at the database level
- Idempotent (safe to run multiple times)

📁 **`supabase/demo_seed.sql`**
- Sample data for 2 demo users
- 7 accounts, 4 projects, 15 transactions, 9 worklogs
- Perfect for testing multi-user isolation

📁 **`supabase/README.md`**
- Complete step-by-step setup guide
- Instructions for creating demo users
- Verification queries
- Troubleshooting tips

### How to Apply

**Quick Start:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250128000001_enable_rls_policies.sql`
3. Paste and click "Run"
4. Verify RLS is enabled (see queries in the migration file)

**For Testing:**
1. Create demo users in Supabase Auth (demo1@example.com, demo2@example.com)
2. Update UUIDs in `demo_seed.sql`
3. Run seed file in SQL Editor
4. Test multi-user isolation by logging in as different users

**Detailed Instructions:** See `supabase/README.md`

### Security Benefits

Once applied, RLS provides:
- ✅ **Database-level security**: Users can only access their own data
- ✅ **Protection from client manipulation**: Even if client code is bypassed, DB enforces rules
- ✅ **Automatic filtering**: No need for `.eq("user_id", uid)` in every query
- ✅ **Multi-user ready**: Complete data isolation between users

### Current State

- **Client-side filtering**: ✅ All queries include `.eq("user_id", user.id)`
- **Database RLS**: 🟡 Migration ready but not applied
- **Multi-user safe**: ⚠️ Depends on client code integrity until RLS is enabled

## Authentication Flow

### Supabase Client Setup
- **Location**: `lib/supabase.ts`
- **Type**: Browser client only (`@supabase/ssr`)
- **Config**: Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Login Flow
- **Page**: `app/(auth)/login/page.tsx`
- **Method**: `supabase.auth.signInWithPassword({ email, password })`
- **Redirect**: → `/accounts` on success
- **Features**:
  - Password reset via email
  - No signup UI (users pre-created in Supabase)

### Route Protection
- **Component**: `components/AuthGuard.tsx`
- **Pattern**:
  ```typescript
  supabase.auth.getSession() → if no session → redirect to /login
  ```
- **Used on**: accounts, balance, worklog, projects, account-overview
- **NOT used on**: summary page ⚠️ (potential security issue)

### Data Access Pattern
Every protected page follows:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const data = await supabase.from("table").select().eq("user_id", user.id);
```

### ⚠️ Auth Issues
- ❌ No server-side middleware
- ❌ No Row Level Security (RLS) policies visible
- ❌ All auth checks are client-side only
- ❌ Summary page (`app/summary/page.tsx:42`) fetches data **without user_id filter**

## Data Models

### Database Tables

#### `accounts`
```typescript
{
  id: string;
  user_id: string;           // FK to auth.users
  name: string;              // e.g., "TD Chequing", "RBC Visa"
  category: string;          // "活期账户" | "信用账户" | "现金账户" | "社保账户"
  owner: string;             // Account holder name
  currency: string;          // "CAD", "CNY", etc.
  card_number: string;
  note: string;
  initial_balance: number;   // Starting balance
  initial_date: string | null; // Start counting transactions from this date
  created_at: timestamp;
}
```
**Note**: Balance is calculated dynamically from `initial_balance + sum(transactions)`, not stored.

#### `transactions`
```typescript
{
  id: string;
  user_id: string;           // FK to auth.users
  account_id: string;        // FK to accounts.id
  date: string;              // YYYY-MM-DD
  type: string;              // "收入" | "支出" | "转账"
  category: string;          // e.g., "食物", "交通", "工资"
  subcategory: string;       // e.g., "买菜", "餐厅/外卖"
  amount: number;            // Positive for income, negative for expenses
  currency: string;
  note: string;
  created_at: timestamp;
}
```

#### `projects`
```typescript
{
  id: string;
  user_id: string;           // FK to auth.users
  name: string;
  location: string;
  expected_start_date: string;
  expected_end_date: string;
  actual_start_date: string;
  actual_end_date: string;
  note: string;
  created_at: timestamp;
}
```

#### `worklogs`
```typescript
{
  id: string;
  user_id: string;           // FK to auth.users
  project_id: string | null; // FK to projects.id
  date: string;              // YYYY-MM-DD
  start_time: string;        // HH:MM
  end_time: string;          // HH:MM
  hours: number;             // Calculated duration
  location: string;
  note: string;
  created_at: timestamp;
}
```

### Balance Calculation Logic
**Files**: `app/accounts/page.tsx:96-104`, `app/balance/BalanceContent.tsx:33-41`

```typescript
const getCurrentBalance = (account: Account): number => {
  // Filter transactions after initial_date
  const txAfterStart = transactions.filter(
    tx => tx.account_id === account.id &&
          (!account.initial_date || tx.date >= account.initial_date)
  );
  // Sum transaction amounts
  const delta = txAfterStart.reduce((sum, tx) => sum + tx.amount, 0);
  return (account.initial_balance || 0) + delta;
};
```

## Supabase Usage

### Client Creation
**File**: `lib/supabase.ts`
```typescript
'use client';
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Common Query Patterns

#### User-scoped reads
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data } = await supabase
  .from("accounts")
  .select("*")
  .eq("user_id", user.id)
  .order("name");
```

#### Joins (worklogs with projects)
```typescript
const { data } = await supabase
  .from("worklogs")
  .select("*, project:projects(name)")
  .eq("user_id", user.id)
  .order("date", { ascending: false });
```

#### Inserts
```typescript
await supabase.from("transactions").insert({
  user_id: user.id,
  account_id,
  date,
  type,
  category,
  amount,
  // ...
});
```

### Usage by Route

| Route | Tables | Operations |
|-------|--------|------------|
| `/accounts` | accounts, transactions | CRUD accounts, read txs for balance |
| `/transactions` | transactions, accounts | CRUD transactions, read accounts for dropdown |
| `/summary` | transactions, accounts | Read + group by month/category (⚠️ no user filter!) |
| `/account-overview` | accounts, transactions | Read + calculate monthly balances |
| `/balance` | accounts, transactions | Read + calculate current balances |
| `/worklog` | worklogs, projects | CRUD worklogs, read projects for dropdown |
| `/projects` | projects | CRUD projects |

## Internationalization (i18n)

**Files**: `app/i18n.ts`, `app/i18n-context.tsx`

### Implementation
- **Storage**: Language preference in `localStorage` via `useLocalStorage` hook
- **Languages**: Chinese (default), English
- **Pattern**:
  ```typescript
  // Database stores Chinese strings
  category: "食物"

  // Translation at display time
  t("食物", lang) // → "食物" (zh) or "Food" (en)
  ```

### Translation Dictionary
**File**: `app/i18n.ts` (236 lines)
- Maps Chinese keys to English values
- Covers: UI labels, categories, subcategories, account types, etc.
- Function: `export function t(key: string, lang: Lang)`

### Context Provider
**File**: `app/i18n-context.tsx`
- Provides `lang` and `setLang` to entire app
- Wraps app in `layout.tsx`

## Tech Debt & Multi-User Concerns

### 🔴 Critical Issues

#### 1. Hardcoded Personal Data ✅ FIXED
**File**: `components/FixedExpenses.tsx`
**Status**: ✅ Removed all hardcoded personal data
**Fix Applied**: Component now shows placeholder message directing users to add expenses manually in transactions.

#### 2. Personal Category Names
**File**: `app/transactions/page.tsx:11-50`
```typescript
"食物": ["买菜", "餐厅/外卖", "工作餐（JH）", "工作餐（LJS）", ...]
"车辆": ["LEXUS贷款", "LEXUS加油", "Dodge加油", ...]
```
**Impact**: Categories contain initials (JH, LJS) and specific vehicle brands.
**Fix**: Create user-customizable categories table.

#### 3. Summary Page Missing Auth ✅ FIXED
**File**: `app/summary/page.tsx`
**Status**: ✅ Added AuthGuard wrapper and user_id filtering
**Fix Applied**:
- Wrapped page in `<AuthGuard>` component
- Added `.eq("user_id", user.id)` to transactions query
- Now properly isolates user data

#### 4. Row-Level Security 🟡 PREPARED (Not Yet Applied)
**Status**: 🟡 SQL migration files created, ready to apply
**Location**: `supabase/migrations/20250128000001_enable_rls_policies.sql`
**What's Ready**:
- ✅ RLS policies for all tables (accounts, transactions, projects, worklogs)
- ✅ Policies enforce `user_id = auth.uid()` at database level
- ✅ Demo seed file for testing multi-user setup
- ✅ Complete documentation in `supabase/README.md`

**To Apply**: Follow instructions in `supabase/README.md`

**Current State**: Client-side filtering only (but migration ready to deploy)

### 🟡 Medium Priority Issues

#### 5. No User Settings/Preferences
- Default currency hardcoded as "CAD"
- Categories hardcoded in component code
- No onboarding flow
- **Fix**: Create `user_settings` table with preferences.

#### 6. Deprecated `balance` Field
**File**: `app/accounts/page.tsx:60`
```typescript
balance: 0,  // Not used - balance calculated from transactions
```
**Impact**: Could cause confusion if database column still exists.
**Fix**: Remove from type definition and ensure DB column is dropped.

#### 7. Account Category Limitations
**File**: `app/accounts/page.tsx:13-18`
```typescript
const ACCOUNT_CATEGORY_OPTIONS = [
  "活期账户",  // Chequing
  "信用账户",  // Credit
  "现金账户",  // Cash
  "社保账户",  // Social Insurance
];
```
**Impact**: Limited, China-specific categories. No flexibility.
**Fix**: Make categories user-customizable or add more defaults.

### 🟢 Low Priority / Code Quality

#### 8. No Server-Side Auth
- All routes use client-side `AuthGuard`
- No Next.js middleware for route protection
- **Fix**: Add `middleware.ts` with auth checks.

#### 9. Inconsistent Error Handling
- Most errors shown via `alert()`
- No error boundaries
- **Fix**: Implement toast notifications and error boundaries.

#### 10. Inconsistent Type Handling
**File**: `app/transactions/page.tsx:179-195`
```typescript
// Toggle handles both Chinese and English strings
if (type === "收入" || type === "income") return "expense";
```
**Impact**: Code must handle dual type system.
**Fix**: Normalize to English in database, translate at display.

#### 11. Currency Assumptions
- Summary page filters `currency === "CAD"` only
- Multi-currency exists but not fully utilized
- **Fix**: Add currency selector or show all with conversion.

#### 12. No Pagination
- All transactions loaded at once
- Could be slow with years of data
- **Fix**: Add pagination or infinite scroll.

## Key Architectural Decisions

### ✅ Good Patterns
- **Type safety**: Strong TypeScript usage with defined types
- **Modern stack**: Next.js 15, React 19, Supabase
- **Bilingual support**: Comprehensive i18n system
- **Excel export**: Every list view has export functionality
- **Consistent UI**: Similar CRUD patterns across pages

### ⚠️ Architectural Concerns
- **No API layer**: Direct Supabase access from components
  - Pro: Simple, fast development
  - Con: Hard to add validation, logging, or business logic
- **Client-only auth**: No server-side protection
  - Pro: Easy to implement
  - Con: Security risks if client bypassed
- **Hardcoded business logic**: Categories, calculations in components
  - Pro: No extra database tables needed
  - Con: Not customizable per user

## Routes Summary

| Route | Auth | Purpose | Multi-User Safe? |
|-------|------|---------|------------------|
| `/` | ❌ | Landing page | ✅ |
| `/login` | ❌ | Authentication | ✅ |
| `/accounts` | ✅ | Manage bank/credit accounts | ✅ (FixedExpenses now generic) |
| `/transactions` | ✅ | Track income/expenses | ⚠️ (personal categories remain) |
| `/summary` | ✅ | Monthly financial summary | ✅ (AuthGuard + user filter added) |
| `/account-overview` | ✅ | Monthly balance trends | ✅ |
| `/balance` | ✅ | Current balance snapshot | ✅ |
| `/worklog` | ✅ | Log work hours | ✅ |
| `/projects` | ✅ | Manage work projects | ✅ |

## Recommendations for Multi-User Refactor

### Phase 1: Critical Security Fixes
1. 🟡 **Add RLS policies to all tables** - Migration ready in `supabase/migrations/` (not yet applied)
2. ✅ **Fix summary page** - AuthGuard + user filter added
3. ✅ **Remove FixedExpenses personal data** - Component now shows generic placeholder
4. ⚠️ **Add Next.js middleware** - Optional; RLS provides database-level protection

### Phase 2: Personalization
5. ✅ Create `categories` and `subcategories` tables
6. ✅ Seed default categories on user signup
7. ✅ Create `user_settings` table (default currency, language)
8. ✅ Add signup flow + onboarding wizard

### Phase 3: Code Quality
9. ✅ Replace `alert()` with toast notifications
10. ✅ Add error boundaries
11. ✅ Extract balance calculation to shared utility
12. ✅ Add pagination for transaction lists

## Development Commands

```bash
# Development (port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Dependencies Highlights

- **@supabase/ssr**: ^0.6.1 (SSR-compatible Supabase client)
- **@supabase/supabase-js**: ^2.49.4 (Supabase SDK)
- **next**: 15.3.1 (App Router)
- **react**: ^19.0.0
- **xlsx**: ^0.18.5 (Excel export)
- **file-saver**: ^2.0.5 (Download helper)

---

**Last Updated**: Based on codebase state at commit `2982d50`
