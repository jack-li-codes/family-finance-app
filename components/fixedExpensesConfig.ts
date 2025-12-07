/**
 * Fixed Expenses Configuration
 * Defines demo and real fixed expense data (ENGLISH DEMO VERSION)
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
 * ✅ Used for DEMO display only (Accounts page yellow card)
 */
export const demoFixedExpenses: FixedExpense[] = [
  {
    id: 1,
    name: "Rent",
    amount: 1500.0,
    note: "Demo downtown apartment",
    icon: "🏠",
    currency: "CAD",
    sort_order: 1,
  },
  {
    id: 2,
    name: "Utilities",
    amount: 120.0,
    note: "Demo utilities bill",
    icon: "💡",
    currency: "CAD",
    sort_order: 2,
  },
  {
    id: 3,
    name: "Internet & Mobile",
    amount: 85.0,
    note: "Demo internet & phone",
    icon: "📱",
    currency: "CAD",
    sort_order: 3,
  },
  {
    id: 4,
    name: "Car Insurance",
    amount: 180.0,
    note: "Demo auto insurance",
    icon: "🚗",
    currency: "CAD",
    sort_order: 4,
  },
  {
    id: 5,
    name: "Gym Membership",
    amount: 60.0,
    note: "Demo gym fee",
    icon: "💪",
    currency: "CAD",
    sort_order: 5,
  },
];

/**
 * Real fixed expenses for actual users (EN version for demo/export/report)
 */
export const realFixedExpenses: FixedExpense[] = [
  {
    id: 101,
    name: "Mortgage",
    amount: 2200.0,
    note: "Monthly mortgage payment",
    icon: "🏡",
    currency: "CAD",
    sort_order: 1,
  },
  {
    id: 102,
    name: "Property Tax",
    amount: 380.0,
    note: "Municipal property tax",
    icon: "🏛️",
    currency: "CAD",
    sort_order: 2,
  },
  {
    id: 103,
    name: "Utilities",
    amount: 150.0,
    note: "Electricity, water, gas",
    icon: "💡",
    currency: "CAD",
    sort_order: 3,
  },
  {
    id: 104,
    name: "Internet",
    amount: 75.0,
    note: "Bell Fibe",
    icon: "🌐",
    currency: "CAD",
    sort_order: 4,
  },
  {
    id: 105,
    name: "Mobile Phone",
    amount: 120.0,
    note: "Family plan",
    icon: "📱",
    currency: "CAD",
    sort_order: 5,
  },
  {
    id: 106,
    name: "Car Insurance",
    amount: 280.0,
    note: "Two vehicles insured",
    icon: "🚗",
    currency: "CAD",
    sort_order: 6,
  },
  {
    id: 107,
    name: "Lexus Car Loan",
    amount: 650.0,
    note: "Vehicle financing",
    icon: "🚙",
    currency: "CAD",
    sort_order: 7,
  },
];
