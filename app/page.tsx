'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import BudgetAccount from './components/BudgetAccount';
import TransactionsTab from './components/TransactionsTab';
import SpendingTab from './components/SpendingTab';
import BalancesTab from './components/BalancesTab';
import ArchiveTab from './components/ArchiveTab';
import type { Txn, Account, Bill, BudgetIncome, ManualAccount, Category } from './components/types';
import { fmt, fmtSigned, today, myShare, incomeShare, catColors } from './components/constants';

export default function App() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<BudgetIncome[]>([]);
  const [manualAccountsDb, setManualAccountsDb] = useState<ManualAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const [tab, setTab] = useState('budget');

  useEffect(() => {
    try {
      const t = localStorage.getItem('cache_txns'); if (t) setTxns(JSON.parse(t));
      const a = localStorage.getItem('cache_archived'); if (a) setArchivedTxns(JSON.parse(a));
      const acc = localStorage.getItem('cache_accounts'); if (acc) setAccounts(JSON.parse(acc));
      const b = localStorage.getItem('cache_bills'); if (b) setBills(JSON.parse(b));
      const inc = localStorage.getItem('cache_income'); if (inc) setIncome(JSON.parse(inc));
    } catch {}
  }, []);

  const fetchTxns = async () => {
    setLoading(true);
    try { const data = await fetch('/api/transactions').then(r => r.json()); setTxns(data); localStorage.setItem('cache_txns', JSON.stringify(data)); } catch {}
    setLoading(false);
  };
  const fetchAccounts = async () => {
    try { const data = await fetch('/api/balances').then(r => r.json()); setAccounts(data); localStorage.setItem('cache_accounts', JSON.stringify(data)); } catch {}
  };
  const fetchManualAccounts = async () => {
    try { const data = await fetch('/api/manual-accounts').then(r => r.json()); setManualAccountsDb(data); } catch {}
  };
  const fetchBudget = useCallback(async () => {
    try { const { bills, income } = await fetch('/api/budget').then(r => r.json()); setBills(bills); setIncome(income); localStorage.setItem('cache_bills', JSON.stringify(bills)); localStorage.setItem('cache_income', JSON.stringify(income)); } catch {}
  }, []);
  const fetchArchived = useCallback(async () => {
    try { const data = await fetch('/api/transactions/archived').then(r => r.json()); setArchivedTxns(data); localStorage.setItem('cache_archived', JSON.stringify(data)); } catch {}
  }, []);

  useEffect(() => { fetchBudget(); fetchArchived(); fetchAccounts(); fetchManualAccounts(); }, [fetchBudget, fetchArchived]);

  const budgetApi = async (action: string, table: string, data: any) => {
    await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, table, data }) });
    fetchBudget();
  };

  const connectBank = async () => {
    const { link_token } = await fetch('/api/create-link-token', { method: 'POST' }).then(r => r.json());
    const handler = (window as any).Plaid.create({
      token: link_token,
      onSuccess: async (public_token: string) => {
        await fetch('/api/exchange-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token }) });
        setLinked(true); fetchTxns(); fetchAccounts(); fetchArchived();
      },
    });
    handler.open();
  };

  const updateField = async (id: string, field: string, val: any) => {
    const clearCategory = field === 'label' && (val === 'Ignore' || val === 'Nick');
    setTxns(prev => prev.map(t => t.id === id ? { ...t, [field]: val, ...(clearCategory ? { category: null } : {}) } : t));
    setArchivedTxns(prev => prev.map(t => t.id === id ? { ...t, [field]: val, ...(clearCategory ? { category: null } : {}) } : t));
    await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field, val }) });
    if (clearCategory) await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field: 'category', val: null }) });
  };

  const archiveMonth = async (month: string, type: 'label' | 'category') => {
    await fetch('/api/transactions/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month, type }) });
    fetchTxns(); fetchArchived();
  };

  const addManualAccount = async (name: string) => {
    if (!name.trim() || manualAccountsDb.find(ma => ma.name === name.trim())) return;
    await fetch('/api/manual-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', name: name.trim(), balance: 0, balance_date: today }) });
    await fetchManualAccounts();
  };

  const addManualTxn = async (newTxn: { date: string; merchant: string; amount: string; account: string }) => {
    if (!newTxn.merchant || !newTxn.amount || !newTxn.date) return;
    const txn: Txn = { id: `manual-${Date.now()}`, date: newTxn.date, merchant: newTxn.merchant, amount: parseFloat(newTxn.amount), account: newTxn.account || null, label: null, category: null, notes: '', archived: false, label_archived: false, category_archived: false };
    await fetch('/api/transactions/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txn) });
    if (newTxn.account && !manualAccountsDb.find(ma => ma.name === newTxn.account)) {
      await fetch('/api/manual-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', name: newTxn.account, balance: 0, balance_date: today }) });
      fetchManualAccounts();
    }
    setTxns(prev => [txn, ...prev]);
  };

  const updateManualBalance = async (id: number, balance: number) => {
    await fetch('/api/manual-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_balance', id, balance, balance_date: today }) });
    fetchManualAccounts();
  };

  const allTxns = useMemo(() => {
    const seen = new Set<string>();
    return [...txns, ...archivedTxns].filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [txns, archivedTxns]);

  const labelArchivedMonths = useMemo(() => {
    const months = new Set<string>();
    archivedTxns.forEach(t => months.add(t.date.slice(0, 7)));
    return months;
  }, [archivedTxns]);

  const ytdStats = useMemo(() => ({
    total: allTxns.reduce((s, t) => s + myShare(t), 0),
    income: allTxns.reduce((s, t) => s + incomeShare(t), 0),
  }), [allTxns]);

  const ytdCatTotals = useMemo(() => {
    const map: Record<string, number> = {};
    allTxns.filter(t => t.label === 'Maddie' || t.label === 'Joint').forEach(t => { if (!t.category) return; map[t.category] = (map[t.category] || 0) + myShare(t); });
    return map;
  }, [allTxns]);

  const SPENDABLE_SUBTYPES = new Set(['savings', 'checking']);
  const EXCLUDED_MASKS = new Set(['7070']);
  const positiveAccounts = accounts.filter(a => SPENDABLE_SUBTYPES.has(a.subtype) && !EXCLUDED_MASKS.has(a.mask || ''));
  const negativeAccounts = accounts.filter(a => (a.type === 'credit' || a.type === 'loan') && a.subtype !== 'student');
  const manualDebtTotal = useMemo(() => {
    const allTxnAccounts = new Set([...txns, ...archivedTxns].map(t => t.account).filter(Boolean));
    return manualAccountsDb.filter(ma => allTxnAccounts.has(ma.name)).reduce((s, ma) => {
      const laterTxns = [...txns, ...archivedTxns].filter(t => t.account === ma.name && t.date > ma.balance_date);
      return s + ma.balance + laterTxns.reduce((ss, t) => ss + t.amount, 0);
    }, 0);
  }, [manualAccountsDb, txns, archivedTxns]);

  const netWorth = positiveAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) - negativeAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) - manualDebtTotal;

  const maddieBills = bills.filter(b => b.account === 'maddie');
  const maddieIncome = income.filter(p => p.account === 'maddie');
  const jointBills = bills.filter(b => b.account === 'joint');
  const jointIncome = income.filter(p => p.account === 'joint');

  const handleTogglePaid = (id: number) => { const b = bills.find(b => b.id === id); if (!b) return; budgetApi('update', 'budget_bills', { id, fields: { paid: !b.paid } }); };
  const handleUpdateAmount = async (id: number, amount: string) => {
    const bill = bills.find(b => b.id === id);
    const updates: Promise<any>[] = [fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', table: 'budget_bills', data: { id, fields: { amount } } }) })];
    if (bill?.name === 'Transfer to joint') {
      const match = income.find(p => p.account === 'joint' && p.label === 'Maddie transfer' && p.date === bill.due);
      if (match) updates.push(fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', table: 'budget_income', data: { id: match.id, fields: { amount } } }) }));
    }
    await Promise.all(updates); fetchBudget();
  };
  const handleDeleteBill = (id: number) => budgetApi('delete', 'budget_bills', { id });
  const handleDeleteIncome = (id: number) => budgetApi('delete', 'budget_income', { id });
  const handleAddBill = (account: string) => (bill: any) => budgetApi('upsert', 'budget_bills', { id: Date.now(), account, ...bill, paid: false });
  const handleAddIncome = (account: string) => (inc: any) => budgetApi('upsert', 'budget_income', { id: Date.now(), account, ...inc });

  return (
    <>
      <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" async />
      <div style={{ fontFamily: 'sans-serif', maxWidth: 860, margin: '0 auto', padding: '1rem', paddingTop: 'max(1rem, env(safe-area-inset-top))' as any, overflowAnchor: 'none' as const }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Maddie's Dashboard</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={connectBank} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #ccc', cursor: 'pointer', background: 'white' }}>{linked ? 'Reconnect' : 'Connect'}</button>
            <button onClick={() => { fetchTxns(); fetchAccounts(); fetchArchived(); fetchManualAccounts(); }} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #ccc', cursor: 'pointer', background: 'white' }}>Refresh</button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 6 }}>
            <div style={{ background: '#E8EEF4', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #B0C0D0' }}>
              <p style={{ fontSize: 10, color: '#3A5068', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets</p>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#3A5068' }}>{fmt(positiveAccounts.reduce((s, a) => s + (a.balances.current || 0), 0))}</p>
            </div>
            <div style={{ background: '#F4E8EE', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #D0B0BC' }}>
              <p style={{ fontSize: 10, color: '#683A52', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debts</p>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#683A52' }}>{fmt(negativeAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) + manualDebtTotal)}</p>
            </div>
            <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net</p>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: netWorth >= 0 ? '#3A6850' : '#b04040' }}>{fmtSigned(netWorth)}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div style={{ background: '#D6E4EE', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #9AB0C4' }}>
              <p style={{ fontSize: 10, color: '#3A5468', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total YTD</p>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#3A5468' }}>{fmt(ytdStats.total)}</p>
            </div>
            <div style={{ background: '#E8F4E8', borderRadius: 8, padding: '10px 12px', border: '0.5px solid #A0D0A0' }}>
              <p style={{ fontSize: 10, color: '#2A6030', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Income YTD</p>
              <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#2A6030' }}>{fmt(ytdStats.income)}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {(['Needs', 'Wants', 'Impulse'] as Category[]).map(cat => (
              <div key={cat} style={{ background: catColors[cat].bg, borderRadius: 8, padding: '10px 12px', border: `0.5px solid ${catColors[cat].border}` }}>
                <p style={{ fontSize: 10, color: catColors[cat].color, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat} YTD</p>
                <p style={{ fontSize: 16, fontWeight: 500, margin: 0, color: catColors[cat].color }}>{fmt(ytdCatTotals[cat] || 0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee', marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {['budget', 'transactions', 'spending', 'balances', 'archive'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontWeight: tab === t ? 500 : 400, color: tab === t ? '#000' : '#888', borderBottom: tab === t ? '2px solid #000' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'transactions' && <TransactionsTab txns={txns} loading={loading} manualAccountsDb={manualAccountsDb} updateField={updateField} archiveMonth={archiveMonth} addManualTxn={addManualTxn} addManualAccount={addManualAccount} />}
        {tab === 'spending' && <SpendingTab allTxns={allTxns} labelArchivedMonths={labelArchivedMonths} updateField={updateField} archiveMonth={archiveMonth} />}
        {tab === 'balances' && <BalancesTab accounts={accounts} manualAccountsDb={manualAccountsDb} txns={txns} archivedTxns={archivedTxns} updateManualBalance={updateManualBalance} />}
        {tab === 'budget' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <BudgetAccount title="Maddie — personal" bills={maddieBills} income={maddieIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('maddie')} onAddIncome={handleAddIncome('maddie')} />
            <BudgetAccount title="Joint account" bills={jointBills} income={jointIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('joint')} onAddIncome={handleAddIncome('joint')} />
          </div>
        )}
        {tab === 'archive' && <ArchiveTab archivedTxns={archivedTxns} updateField={updateField} />}

      </div>
    </>
  );
}