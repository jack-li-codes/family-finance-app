-- =====================================================
-- DEMO DATA SEED FILE
-- Family Finance App - Sample Data for Testing
-- =====================================================
--
-- INSTRUCTIONS:
-- ============
--
-- 1. CREATE DEMO USERS (via Supabase Dashboard or Auth API):
--    Go to Supabase Dashboard → Authentication → Users → Add User
--
--    User 1:
--    - Email: demo1@example.com
--    - Password: Demo123!@# (or your choice)
--    - After creation, copy the user's UUID
--
--    User 2:
--    - Email: demo2@example.com
--    - Password: Demo456!@# (or your choice)
--    - After creation, copy the user's UUID
--
-- 2. REPLACE USER IDs BELOW:
--    Replace the placeholder UUIDs below with the actual UUIDs
--    from your created users:
--    - Replace 'USER_1_UUID_HERE' with demo1@example.com's UUID
--    - Replace 'USER_2_UUID_HERE' with demo2@example.com's UUID
--
-- 3. RUN THIS SQL:
--    Execute this file in Supabase SQL Editor after replacing UUIDs
--
-- =====================================================

-- Set demo user IDs (REPLACE THESE WITH ACTUAL UUIDs FROM SUPABASE AUTH)
DO $$
DECLARE
  demo_user_1 UUID := 'bcec6486-5637-4781-a04e-7c32c83782aa'; -- Replace with actual UUID for demo1@example.com
  demo_user_2 UUID := '11b5e7f2-d5c1-4494-b463-c9bba4b5d053'; -- Replace with actual UUID for demo2@example.com
BEGIN

-- =====================================================
-- DEMO USER 1: demo1@example.com
-- =====================================================

-- Accounts for User 1
INSERT INTO accounts (user_id, name, category, owner, currency, card_number, note, initial_balance, initial_date, created_at)
VALUES
  (demo_user_1, 'TD Chequing', '活期账户', 'John Doe', 'CAD', '**** 1234', 'Main checking account', 5000.00, '2024-01-01'::date, NOW()),
  (demo_user_1, 'RBC Visa', '信用账户', 'John Doe', 'CAD', '**** 5678', 'Primary credit card', 0.00, '2024-01-01'::date, NOW()),
  (demo_user_1, 'Cash Wallet', '现金账户', 'John Doe', 'CAD', 'N/A', 'Physical cash', 200.00, '2024-01-01'::date, NOW()),
  (demo_user_1, 'Bank of China', '活期账户', 'John Doe', 'CNY', '**** 9012', 'China account', 10000.00, '2024-01-01'::date, NOW());

-- Projects for User 1
INSERT INTO projects (user_id, name, location, expected_start_date, expected_end_date, actual_start_date, actual_end_date, note, created_at)
VALUES
  (demo_user_1, 'Kitchen Renovation', 'Home',
   '2024-11-01'::date, '2024-12-31'::date, '2024-11-05'::date, NULL,
   'Complete kitchen remodel', NOW()),
  (demo_user_1, 'Client Website', 'Remote',
   '2024-10-15'::date, '2024-11-15'::date, '2024-10-15'::date, '2024-11-10'::date,
   'E-commerce site for ABC Corp', NOW());

-- Get account IDs for transactions (using a subquery)
WITH user1_accounts AS (
  SELECT id, name FROM accounts WHERE user_id = demo_user_1
)

-- Transactions for User 1
INSERT INTO transactions (user_id, account_id, date, type, category, subcategory, amount, currency, note, created_at)
SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'TD Chequing'),
  '2024-10-01'::date,
  '收入',
  '工资',
  '工资',
  5000.00,
  'CAD',
  'October salary',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'TD Chequing'),
  '2024-10-05'::date,
  '支出',
  '食物',
  '买菜',
  -85.50,
  'CAD',
  'Grocery shopping at Costco',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'TD Chequing'),
  '2024-10-08'::date,
  '支出',
  '食物',
  '餐厅/外卖',
  -45.00,
  'CAD',
  'Dinner at restaurant',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'RBC Visa'),
  '2024-10-10'::date,
  '支出',
  '车辆',
  '车1加油',
  -60.00,
  'CAD',
  'Gas fill-up',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'TD Chequing'),
  '2024-10-15'::date,
  '支出',
  '房屋',
  '网费',
  -74.00,
  'CAD',
  'Internet bill',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'RBC Visa'),
  '2024-10-20'::date,
  '支出',
  '家用',
  '厨房用品',
  -125.00,
  'CAD',
  'Kitchen supplies for renovation',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'TD Chequing'),
  '2024-10-25'::date,
  '转账',
  '转账',
  '还信用卡',
  -500.00,
  'CAD',
  'Pay off credit card',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'RBC Visa'),
  '2024-10-25'::date,
  '转账',
  '转账',
  '还信用卡',
  500.00,
  'CAD',
  'Receive payment from chequing',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_accounts WHERE name = 'Bank of China'),
  '2024-10-12'::date,
  '支出',
  '食物',
  '餐厅/外卖',
  -150.00,
  'CNY',
  'Family dinner in China',
  NOW();

-- Worklogs for User 1
WITH user1_projects AS (
  SELECT id, name FROM projects WHERE user_id = demo_user_1
)
INSERT INTO worklogs (user_id, project_id, date, start_time, end_time, hours, location, note, created_at)
SELECT
  demo_user_1,
  (SELECT id FROM user1_projects WHERE name = 'Kitchen Renovation'),
  '2024-11-05'::date,
  '09:00'::time,
  '17:00'::time,
  8.0,
  'Home',
  'Demolition of old cabinets',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_projects WHERE name = 'Kitchen Renovation'),
  '2024-11-06'::date,
  '09:00'::time,
  '15:00'::time,
  6.0,
  'Home',
  'Electrical work preparation',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_projects WHERE name = 'Client Website'),
  '2024-10-15'::date,
  '10:00'::time,
  '18:00'::time,
  8.0,
  'Office',
  'Initial design mockups',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_projects WHERE name = 'Client Website'),
  '2024-10-20'::date,
  '09:00'::time,
  '17:00'::time,
  8.0,
  'Office',
  'Frontend development - homepage',
  NOW()
UNION ALL SELECT
  demo_user_1,
  (SELECT id FROM user1_projects WHERE name = 'Client Website'),
  '2024-10-25'::date,
  '10:00'::time,
  '16:00'::time,
  6.0,
  'Remote',
  'Backend API integration',
  NOW();

-- =====================================================
-- DEMO USER 2: demo2@example.com
-- =====================================================

-- Accounts for User 2
INSERT INTO accounts (user_id, name, category, owner, currency, card_number, note, initial_balance, initial_date, created_at)
VALUES
  (demo_user_2, 'Scotia Bank Checking', '活期账户', 'Jane Smith', 'CAD', '**** 3456', 'Primary account', 3000.00, '2024-01-01'::date, NOW()),
  (demo_user_2, 'CIBC Mastercard', '信用账户', 'Jane Smith', 'CAD', '**** 7890', 'Credit card', 0.00, '2024-01-01'::date, NOW()),
  (demo_user_2, 'Savings Account', '活期账户', 'Jane Smith', 'CAD', '**** 1111', 'Emergency fund', 15000.00, '2024-01-01'::date, NOW());

-- Projects for User 2
INSERT INTO projects (user_id, name, location, expected_start_date, expected_end_date, actual_start_date, actual_end_date, note, created_at)
VALUES
  (demo_user_2, 'Backyard Deck', 'Home',
   '2024-09-01'::date, '2024-10-15'::date, '2024-09-05'::date, '2024-10-12'::date,
   'New deck construction', NOW()),
  (demo_user_2, 'Freelance App Development', 'Remote',
   '2024-10-01'::date, '2024-12-31'::date, '2024-10-01'::date, NULL,
   'Mobile app for startup', NOW());

-- Transactions for User 2
WITH user2_accounts AS (
  SELECT id, name FROM accounts WHERE user_id = demo_user_2
)
INSERT INTO transactions (user_id, account_id, date, type, category, subcategory, amount, currency, note, created_at)
SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'Scotia Bank Checking'),
  '2024-10-01'::date,
  '收入',
  '工资',
  '工资',
  4500.00,
  'CAD',
  'October salary',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'Scotia Bank Checking'),
  '2024-10-03'::date,
  '支出',
  '食物',
  '买菜',
  -120.00,
  'CAD',
  'Weekly groceries',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'CIBC Mastercard'),
  '2024-10-07'::date,
  '支出',
  '娱乐',
  '电影/演出',
  -75.00,
  'CAD',
  'Concert tickets',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'Scotia Bank Checking'),
  '2024-10-12'::date,
  '支出',
  '房屋',
  '电费',
  -85.00,
  'CAD',
  'Electricity bill',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'CIBC Mastercard'),
  '2024-10-18'::date,
  '支出',
  '购物',
  '服装',
  -150.00,
  'CAD',
  'New winter jacket',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_accounts WHERE name = 'Savings Account'),
  '2024-10-22'::date,
  '收入',
  '补贴',
  '平帐补贴',
  100.00,
  'CAD',
  'Interest earned',
  NOW();

-- Worklogs for User 2
WITH user2_projects AS (
  SELECT id, name FROM projects WHERE user_id = demo_user_2
)
INSERT INTO worklogs (user_id, project_id, date, start_time, end_time, hours, location, note, created_at)
SELECT
  demo_user_2,
  (SELECT id FROM user2_projects WHERE name = 'Backyard Deck'),
  '2024-09-05'::date,
  '08:00'::time,
  '16:00'::time,
  8.0,
  'Home',
  'Foundation work',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_projects WHERE name = 'Backyard Deck'),
  '2024-09-10'::date,
  '08:00'::time,
  '17:00'::time,
  9.0,
  'Home',
  'Deck framing',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_projects WHERE name = 'Freelance App Development'),
  '2024-10-05'::date,
  '09:00'::time,
  '17:00'::time,
  8.0,
  'Home Office',
  'UI/UX design',
  NOW()
UNION ALL SELECT
  demo_user_2,
  (SELECT id FROM user2_projects WHERE name = 'Freelance App Development'),
  '2024-10-12'::date,
  '10:00'::time,
  '18:00'::time,
  8.0,
  'Home Office',
  'React Native setup',
  NOW();

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the data was inserted correctly:

-- SELECT user_id, COUNT(*) as account_count FROM accounts GROUP BY user_id;
-- SELECT user_id, COUNT(*) as transaction_count FROM transactions GROUP BY user_id;
-- SELECT user_id, COUNT(*) as project_count FROM projects GROUP BY user_id;
-- SELECT user_id, COUNT(*) as worklog_count FROM worklogs GROUP BY user_id;
