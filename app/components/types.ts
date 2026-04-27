export type Label = 'Mine' | 'Joint' | 'Ignore';
export type Category = 'Needs' | 'Wants' | 'Income';

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
};

export type Account = {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
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
