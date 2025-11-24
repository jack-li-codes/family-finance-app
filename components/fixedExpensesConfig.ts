/**
 * Fixed Expenses Configuration
 * Defines demo and real fixed expense data
 */

export type FixedExpense = {
  id: number;
  name: string;
  amount: number;
  note: string;
  icon: string;
  currency: string;
  sort_order: number;
};

/**
 * Demo fixed expenses for demo1@example.com and demo2@example.com
 */
export const demoFixedExpenses: FixedExpense[] = [
  {
    id: 1,
    name: "房租",
    amount: 1500.00,
    note: "Demo 市中心公寓",
    icon: "🏠",
    currency: "CAD",
    sort_order: 1,
  },
  {
    id: 2,
    name: "水电燃气",
    amount: 120.00,
    note: "Demo 公用事业费",
    icon: "💡",
    currency: "CAD",
    sort_order: 2,
  },
  {
    id: 3,
    name: "网络/手机",
    amount: 85.00,
    note: "Demo 通讯费",
    icon: "📱",
    currency: "CAD",
    sort_order: 3,
  },
  {
    id: 4,
    name: "车险",
    amount: 180.00,
    note: "Demo 汽车保险",
    icon: "🚗",
    currency: "CAD",
    sort_order: 4,
  },
  {
    id: 5,
    name: "健身房",
    amount: 60.00,
    note: "Demo 会员费",
    icon: "💪",
    currency: "CAD",
    sort_order: 5,
  },
];

/**
 * Real fixed expenses for actual users
 * Replace these with your real family fixed expenses
 */
export const realFixedExpenses: FixedExpense[] = [
  {
    id: 101,
    name: "房贷",
    amount: 2200.00,
    note: "每月按揭",
    icon: "🏡",
    currency: "CAD",
    sort_order: 1,
  },
  {
    id: 102,
    name: "地税",
    amount: 380.00,
    note: "Property Tax",
    icon: "🏛️",
    currency: "CAD",
    sort_order: 2,
  },
  {
    id: 103,
    name: "水电燃气",
    amount: 150.00,
    note: "Utilities",
    icon: "💡",
    currency: "CAD",
    sort_order: 3,
  },
  {
    id: 104,
    name: "网络",
    amount: 75.00,
    note: "Bell Fibe",
    icon: "🌐",
    currency: "CAD",
    sort_order: 4,
  },
  {
    id: 105,
    name: "手机",
    amount: 120.00,
    note: "家庭套餐",
    icon: "📱",
    currency: "CAD",
    sort_order: 5,
  },
  {
    id: 106,
    name: "车险",
    amount: 280.00,
    note: "两车保险",
    icon: "🚗",
    currency: "CAD",
    sort_order: 6,
  },
  {
    id: 107,
    name: "LEXUS贷款",
    amount: 650.00,
    note: "车贷",
    icon: "🚙",
    currency: "CAD",
    sort_order: 7,
  },
];
