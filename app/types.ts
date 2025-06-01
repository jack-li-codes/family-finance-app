// app/types.ts
export type Transaction = {
    id: string;
    user_id: string;
    account_id: string;
    date: string;
    type: string;
    category: string;
    subcategory: string;
    amount: number;
    currency: string;
    note: string;
  };
  