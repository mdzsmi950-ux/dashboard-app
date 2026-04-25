export type Label = 'Maddie' | 'Nick' | 'Joint' | 'Ignore';
export type Category = 'Needs' | 'Wants' | 'Impulse' | 'Income';

export type Txn = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  account: string | null;
  label: Label | null;
  category: Category | null;
  notes: string;
  archived: boolean;
  label_archived: boolean;
  category_archived: boolean;
};

export type Account = {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string | null;
  balances: { current: number; available: number | null; };
};

export type Bill = {
  id: number;
  account: string;
  name: string;
  amount: string;
  due: string;
  paid: boolean;
  autopay: boolean;
  is_card: boolean;
  statement_locked: boolean;
};

export type BudgetIncome = {
  id: number;
  account: string;
  date: string;
  amount: string;
  label: string;
};

export type ManualAccount = {
  id: number;
  name: string;
  balance: number;
  balance_date: string;
};