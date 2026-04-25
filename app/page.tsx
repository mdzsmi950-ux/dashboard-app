'use client';

import { useEffect, useState } from 'react';
import TransactionsTab from './components/TransactionsTab';
import ArchiveTab from './components/ArchiveTab';
import SpendingTab from './components/SpendingTab';
import BalancesTab from './components/BalancesTab';
import BudgetAccount from './components/BudgetAccount';
import type { Txn, Account, ManualAccount, Bill, BudgetIncome } from './components/types';

type Tab = 'transactions' | 'archive' | 'spending' | 'balances' | 'budget';

export default function Page() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [txns, setTxns] = useState<Txn[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [manualAccountsDb, setManualAccountsDb] = useState<ManualAccount[]>([]);
  const [maddieBills, setMaddieBills] = useState<Bill[]>([]);
  const [nickBills, setNickBills] = useState<Bill[]>([]);
  const [maddieIncome, setMaddieIncome] = useState<BudgetIncome[]>([]);
  const [nickIncome, setNickIncome] = useState<BudgetIncome[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTxns = async () => {
    setLoading(true);
    const res = await fetch('/api/transactions');
    const data = await res.json();
    setTxns(data || []);
    setLoading(false);
  };

  const loadArchived = async () => {
    const res = await fetch('/api/transactions/archived');
    const data = await res.json();
    setArchivedTxns(data || []);
  };

  const loadAccounts = async () => {
    const res = await fetch('/api/balances');
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  };

  const loadManualAccounts = async () => {
    const res = await fetch('/api/manual-accounts');
    const data = await res.json();
    setManualAccountsDb(Array.isArray(data) ? data : []);
  };

  const loadBudget = async () => {
    const res = await fetch('/api/budget');
    const data = await res.json();
    const bills: Bill[] = data.bills || [];
    const income: BudgetIncome[] = data.income || [];
    setMaddieBills(bills.filter(b => b.account === 'maddie'));
    setNickBills(bills.filter(b => b.account === 'joint'));
    setMaddieIncome(income.filter(p => p.account === 'maddie'));
cat > app/page.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import TransactionsTab from './components/TransactionsTab';
import ArchiveTab from './components/ArchiveTab';
import SpendingTab from './components/SpendingTab';
import BalancesTab from './components/BalancesTab';
import BudgetAccount from './components/BudgetAccount';
import type { Txn, Account, ManualAccount, Bill, BudgetIncome } from './components/types';

type Tab = 'transactions' | 'archive' | 'spending' | 'balances' | 'budget';

export default function Page() {
  const [tab, setTab] = useState<Tab>('transactions');
  const [txns, setTxns] = useState<Txn[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [manualAccountsDb, setManualAccountsDb] = useState<ManualAccount[]>([]);
  const [maddieBills, setMaddieBills] = useState<Bill[]>([]);
  const [nickBills, setNickBills] = useState<Bill[]>([]);
  const [maddieIncome, setMaddieIncome] = useState<BudgetIncome[]>([]);
  const [nickIncome, setNickIncome] = useState<BudgetIncome[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTxns = async () => {
    setLoading(true);
    const res = await fetch('/api/transactions');
    const data = await res.json();
    setTxns(data || []);
    setLoading(false);
  };

  const loadArchived = async () => {
    const res = await fetch('/api/transactions/archived');
    const data = await res.json();
    setArchivedTxns(data || []);
  };

  const loadAccounts = async () => {
    const res = await fetch('/api/balances');
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
  };

  const loadManualAccounts = async () => {
    const res = await fetch('/api/manual-accounts');
    const data = await res.json();
    setManualAccountsDb(Array.isArray(data) ? data : []);
  };

  const loadBudget = async () => {
    const res = await fetch('/api/budget');
    const data = await res.json();
    const bills: Bill[] = data.bills || [];
    const income: BudgetIncome[] = data.income || [];
    setMaddieBills(bills.filter(b => b.account === 'maddie'));
    setNickBills(bills.filter(b => b.account === 'joint'));
    setMaddieIncome(income.filter(p => p.account === 'maddie'));
    setNickIncome(income.filter(p => p.account === 'joint'));
  };

  useEffect(() => {
    loadTxns();
    loadArchived();
    loadAccounts();
    loadManualAccounts();
    loadBudget();
  }, []);

  const updateField = async (id: string, field: string, val: any) => {
    setTxns(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
    await fetch('/api/transactions/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, val }),
    });
    if (field === 'label' && val === 'Ignore') {
      setTxns(prev => prev.map(t => t.id === id ? { ...t, category: null } : t));
      await fetch('/api/transactions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'category', val: null }),
      });
    }
  };

  const archiveMonth = async (month: string, type: 'label' | 'category') => {
    await fetch('/api/transactions/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, type }),
    });
    await loadTxns();
    await loadArchived();
  };

  const addManualTxn = async (txn: { date: string; merchant: string; amount: string; account: string }) => {
    await fetch('/api/transactions/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txn),
    });
    await loadTxns();
  };

  const addManualAccount = async (name: string) => {
    await fetch('/api/manual-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name }),
    });
    await loadManualAccounts();
  };

  const updateManualBalance = async (id: number, balance: number) => {
    const today = new Date().toISOString().split('T')[0];
    await fetch('/api/manual-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_balance', id, balance, balance_date: today }),
    });
    await loadManualAccounts();
  };

  const budgetPost = async (body: any) => {
    await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await loadBudget();
  };

  const tabStyle = (t: Tab) => ({
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    background: tab === t ? '#3A5068' : 'transparent',
    color: tab === t ? 'white' : '#888',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: tab === t ? 500 : 400,
  });

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 80px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button style={tabStyle('transactions')} onClick={() => setTab('transactions')}>Transactions</button>
        <button style={tabStyle('archive')} onClick={() => setTab('archive')}>Archive</button>
        <button style={tabStyle('spending')} onClick={() => setTab('spending')}>Spending</button>
        <button style={tabStyle('balances')} onClick={() => setTab('balances')}>Balances</button>
        <button style={tabStyle('budget')} onClick={() => setTab('budget')}>Budget</button>
      </div>

      {tab === 'transactions' && (
        <TransactionsTab
          txns={txns}
          loading={loading}
          manualAccountsDb={manualAccountsDb}
          updateField={updateField}
          archiveMonth={archiveMonth}
          addManualTxn={addManualTxn}
          addManualAccount={addManualAccount}
        />
      )}

      {tab === 'archive' && (
        <ArchiveTab
          archivedTxns={archivedTxns}
          updateField={async (id, field, val) => {
            setArchivedTxns(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
            await fetch('/api/transactions/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, field, val }),
            });
          }}
        />
      )}

      {tab === 'spending' && (
        <SpendingTab
          allTxns={[...txns, ...archivedTxns]}
          updateField={updateField}
        />
      )}

      {tab === 'balances' && (
        <BalancesTab
          accounts={accounts}
          manualAccountsDb={manualAccountsDb}
          txns={txns}
          archivedTxns={archivedTxns}
          updateManualBalance={updateManualBalance}
        />
      )}

      {tab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <BudgetAccount
            title="Maddie"
            bills={maddieBills}
            income={maddieIncome}
            onTogglePaid={(id: number) => budgetPost({ action: 'update', table: 'budget_bills', data: { id, fields: { paid: !maddieBills.find(b => b.id === id)?.paid } } })}
            onUpdateAmount={(id: number, amount: string) => budgetPost({ action: 'update', table: 'budget_bills', data: { id, fields: { amount } } })}
            onDeleteBill={(id: number) => budgetPost({ action: 'delete', table: 'budget_bills', data: { id } })}
            onDeleteIncome={(id: number) => budgetPost({ action: 'delete', table: 'budget_income', data: { id } })}
            onAddBill={(b: any) => budgetPost({ action: 'upsert', table: 'budget_bills', data: { ...b, account: 'maddie' } })}
            onAddIncome={(p: any) => budgetPost({ action: 'upsert', table: 'budget_income', data: { ...p, account: 'maddie' } })}
          />
          <BudgetAccount
            title="Joint"
            bills={nickBills}
            income={nickIncome}
            onTogglePaid={(id: number) => budgetPost({ action: 'update', table: 'budget_bills', data: { id, fields: { paid: !nickBills.find(b => b.id === id)?.paid } } })}
            onUpdateAmount={(id: number, amount: string) => budgetPost({ action: 'update', table: 'budget_bills', data: { id, fields: { amount } } })}
            onDeleteBill={(id: number) => budgetPost({ action: 'delete', table: 'budget_bills', data: { id } })}
            onDeleteIncome={(id: number) => budgetPost({ action: 'delete', table: 'budget_income', data: { id } })}
            onAddBill={(b: any) => budgetPost({ action: 'upsert', table: 'budget_bills', data: { ...b, account: 'joint' } })}
            onAddIncome={(p: any) => budgetPost({ action: 'upsert', table: 'budget_income', data: { ...p, account: 'joint' } })}
          />
        </div>
      )}
    </div>
  );
}
