'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Txn, Account, Bill, BudgetIncome, ManualAccount, Category, Label } from './components/types';
import { fmt, fmtSigned, today, myShare, incomeShare, catColors, labelColors, monthLabel } from './components/constants';
import BudgetAccount from './components/BudgetAccount';

const IconSummary = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconTxn = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconBalance = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconArchive = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8"/>
    <line x1="10" y1="13" x2="14" y2="13"/>
  </svg>
);
const IconBudget = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
);

const TABS = [
  { id: 'transactions', label: 'Transactions', Icon: IconTxn },
  { id: 'balances', label: 'Balances', Icon: IconBalance },
  { id: 'budget', label: 'Budget', Icon: IconBudget },
  { id: 'summary', label: 'Summary', Icon: IconSummary },
  { id: 'archive', label: 'Archive', Icon: IconArchive },
];

const pill = (active: boolean, colors: { bg: string; border: string; color: string }) => ({
  fontSize: 11, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
  border: `0.5px solid ${active ? colors.border : '#e8e8e8'}`,
  background: active ? colors.bg : 'transparent',
  color: active ? colors.color : '#bbb',
  fontWeight: active ? 500 : 400,
} as const);

const isCompleteForArchive = (t: Txn) =>
  t.label === 'Ignore' || ((t.label === 'Mine' || t.label === 'Joint') && t.category !== null);

function TxnCard({ t, updateField }: { t: Txn; updateField: (id: string, f: string, v: any) => void }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '0.5px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.date.slice(5)}{t.account ? ` · ${t.account}` : ''}</div>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.amount < 0 ? '#3A6850' : '#1a1a1a', flexShrink: 0 }}>
          {t.amount < 0 ? '+' : ''}{fmt(t.amount)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {(['Mine', 'Joint', 'Ignore'] as Label[]).map(l => (
          <button key={l} onClick={(e) => { e.preventDefault(); updateField(t.id, 'label', l); }} style={pill(t.label === l, labelColors[l])}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
          const disabled = t.label === 'Ignore' || !t.label;
          return <button key={cat} onClick={(e) => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }} style={pill(!disabled && t.category === cat, catColors[cat])}>{cat}</button>;
        })}
      </div>
    </div>
  );
}

function ArchiveCard({ t, onRecover }: { t: Txn; onRecover: (t: Txn) => void }) {
  const startX = useRef<number | null>(null);
  return (
    <div
      style={{ padding: '12px 0', borderBottom: '0.5px solid #f0f0f0' }}
      onTouchStart={e => { startX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (startX.current !== null && e.changedTouches[0].clientX - startX.current > 80) {
          onRecover(t);
        }
        startX.current = null;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {t.label && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: labelColors[t.label].bg, color: labelColors[t.label].color }}>{t.label}</span>}
            {t.category && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: catColors[t.category].bg, color: catColors[t.category].color }}>{t.category}</span>}
          </div>
          <div style={{ fontSize: 10, color: '#ccc', marginTop: 4 }}>Swipe right to recover</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.amount < 0 ? '#3A6850' : '#1a1a1a' }}>{t.amount < 0 ? '+' : ''}{fmt(t.amount)}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.date.slice(5)}</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<BudgetIncome[]>([]);
  const [manualAccountsDb, setManualAccountsDb] = useState<ManualAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const [tab, setTab] = useState('transactions');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [budgetSubtab, setBudgetSubtab] = useState<'maddie' | 'joint'>('maddie');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');

  useEffect(() => {
    try {
      const t = localStorage.getItem('cache_txns'); if (t) setTxns(JSON.parse(t));
      const a = localStorage.getItem('cache_archived'); if (a) setArchivedTxns(JSON.parse(a));
      const acc = localStorage.getItem('cache_accounts'); if (acc) setAccounts(JSON.parse(acc));
      const b = localStorage.getItem('cache_bills'); if (b) setBills(JSON.parse(b));
      const inc = localStorage.getItem('cache_income'); if (inc) setIncome(JSON.parse(inc));
    } catch {}
  }, []);

  const fetchFromSupabase = async () => {
    setLoading(true);
    try { const d = await fetch("/api/transactions/saved").then(r => r.json()); const safe = Array.isArray(d) ? d : []; setTxns(safe); localStorage.setItem("cache_txns", JSON.stringify(safe)); } catch {}
    setLoading(false);
  };
  const fetchAccounts = async () => {
    try { const d = await fetch("/api/balances").then(r => r.json()); const safe = Array.isArray(d) ? d : []; setAccounts(safe); localStorage.setItem("cache_accounts", JSON.stringify(safe)); } catch {}
  };
  const fetchManualAccounts = async () => {
    try { const d = await fetch("/api/manual-accounts").then(r => r.json()); setManualAccountsDb(Array.isArray(d) ? d : []); } catch {}
  };
  const fetchBudget = useCallback(async () => {
    try { const d = await fetch("/api/budget").then(r => r.json()); setBills(Array.isArray(d?.bills) ? d.bills : []); setIncome(Array.isArray(d?.income) ? d.income : []); } catch {}
  }, []);
  const fetchArchived = useCallback(async () => {
    try { const d = await fetch("/api/transactions/archived").then(r => r.json()); const safe = Array.isArray(d) ? d : []; setArchivedTxns(safe); localStorage.setItem("cache_archived", JSON.stringify(safe)); } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      // Always show Supabase data immediately
      await Promise.all([fetchFromSupabase(), fetchArchived(), fetchManualAccounts(), fetchBudget()]);

      // Then sync with Plaid once per day in background
      const lastSync = localStorage.getItem('last_plaid_sync');
      const todayStr = new Date().toISOString().split('T')[0];
      if (lastSync !== todayStr) {
        try { await fetch('/api/transactions'); } catch {}
        localStorage.setItem('last_plaid_sync', todayStr);
        // Reload transactions after sync
        fetchFromSupabase();
        fetchArchived();
      }
    };
    init();
  }, [fetchBudget, fetchArchived]);

  const connectBank = async () => {
    const { link_token } = await fetch('/api/create-link-token', { method: 'POST' }).then(r => r.json());
    const handler = (window as any).Plaid.create({
      token: link_token,
      onSuccess: async (public_token: string) => {
        await fetch('/api/exchange-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token }) });
        setLinked(true); fetchFromSupabase(); fetchArchived();
      },
    });
    handler.open();
  };

  const updateField = async (id: string, field: string, val: any) => {
    // Build the updated txn optimistically
    const txn = txns.find(t => t.id === id);
    if (!txn) return;

    const updatedTxn: Txn = {
      ...txn,
      [field]: val,
      ...(field === 'label' && val === 'Ignore' ? { category: null } : {}),
    };

    const shouldArchive = isCompleteForArchive(updatedTxn);

    if (shouldArchive) {
      setTxns(prev => prev.filter(t => t.id !== id));
      setArchivedTxns(prev => [{ ...updatedTxn, archived: true }, ...prev]);
    } else {
      setTxns(prev => prev.map(t => t.id === id ? updatedTxn : t));
    }

    // Persist to backend
    await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field, val }) });

    if (field === 'label' && val === 'Ignore') {
      await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field: 'category', val: null }) });
    }

    if (shouldArchive) {
      await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field: 'archived', val: true }) });
    }
  };

  const recoverTxn = async (txn: Txn) => {
    const recovered = { ...txn, archived: false };
    setArchivedTxns(prev => prev.filter(t => t.id !== txn.id));
    setTxns(prev => [recovered, ...prev]);
    await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: txn.id, field: 'archived', val: false }) });
  };

  const budgetApi = async (action: string, table: string, data: any) => {
    await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, table, data }) });
    fetchBudget();
  };

  // All txns for spending totals — includes archived (except Ignore/Income)
  const allTxns = useMemo(() => {
    const seen = new Set<string>();
    return [...txns, ...archivedTxns].filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [txns, archivedTxns]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTxns.forEach(t => months.add(t.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [allTxns]);

  const ytdStats = useMemo(() => ({
    total: allTxns.reduce((s, t) => s + myShare(t), 0),
    income: allTxns.reduce((s, t) => s + incomeShare(t), 0),
    needs: allTxns.filter(t => t.category === 'Needs').reduce((s, t) => s + myShare(t), 0),
    wants: allTxns.filter(t => t.category === 'Wants').reduce((s, t) => s + myShare(t), 0),
    impulse: allTxns.filter(t => t.category === 'Impulse').reduce((s, t) => s + myShare(t), 0),
  }), [allTxns]);

  const monthlyTxns = useMemo(() => {
    if (!selectedMonth) return [];
    return allTxns.filter(t => t.date.startsWith(selectedMonth));
  }, [allTxns, selectedMonth]);

  const monthlyStats = useMemo(() => ({
    total: monthlyTxns.reduce((s, t) => s + myShare(t), 0),
    income: monthlyTxns.reduce((s, t) => s + incomeShare(t), 0),
    needs: monthlyTxns.filter(t => t.category === 'Needs').reduce((s, t) => s + myShare(t), 0),
    wants: monthlyTxns.filter(t => t.category === 'Wants').reduce((s, t) => s + myShare(t), 0),
    impulse: monthlyTxns.filter(t => t.category === 'Impulse').reduce((s, t) => s + myShare(t), 0),
  }), [monthlyTxns]);

  const accountOptions = useMemo(() => Array.from(new Set(txns.map(t => t.account).filter(Boolean))).sort() as string[], [txns]);

  const filteredTxns = useMemo(() => txns.filter(t => {
    const matchAccount = filterAccount === 'All' || t.account === filterAccount;
    const matchMonth = filterMonth === 'All' || t.date.startsWith(filterMonth);
    return matchAccount && matchMonth;
  }), [txns, filterAccount, filterMonth]);

  const txnsByMonth = useMemo(() => {
    const map: Record<string, Txn[]> = {};
    filteredTxns.forEach(t => { const m = t.date.slice(0, 7); if (!map[m]) map[m] = []; map[m].push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTxns]);

  const SPENDABLE = new Set(['savings', 'checking']);
  const EXCL_MASKS = new Set(['7070']);
  const positiveAccounts = accounts.filter(a => SPENDABLE.has(a.subtype) && !EXCL_MASKS.has(a.mask || ''));
  const negativeAccounts = accounts.filter(a => (a.type === 'credit' || a.type === 'loan') && a.subtype !== 'student');
  const displayPositive = accounts.filter(a => a.type !== 'credit' && a.type !== 'loan');
  const displayNegative = accounts.filter(a => a.type === 'credit' || a.type === 'loan');

  const manualWithBalance = useMemo(() => {
    const accts = new Set([...txns, ...archivedTxns].map(t => t.account).filter(Boolean));
    return manualAccountsDb.filter(ma => accts.has(ma.name)).map(ma => {
      const later = [...txns, ...archivedTxns].filter(t => t.account === ma.name && t.date > ma.balance_date);
      return { ...ma, effectiveBalance: ma.balance + later.reduce((s, t) => s + t.amount, 0) };
    });
  }, [manualAccountsDb, txns, archivedTxns]);

  const manualDebt = manualWithBalance.reduce((s, a) => s + a.effectiveBalance, 0);
  const netWorth = positiveAccounts.reduce((s, a) => s + (a.balances.current || 0), 0)
    - negativeAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) - manualDebt;

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

  const filteredArchive = useMemo(() => {
    if (!archiveSearch.trim()) return archivedTxns;
    return archivedTxns.filter(t => t.merchant.toLowerCase().includes(archiveSearch.toLowerCase()));
  }, [archivedTxns, archiveSearch]);

  const TAB_H = 72;

  return (
    <>
      <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" async />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', overflowX: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: TAB_H + 16 }}>

          {tab === 'transactions' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Transactions</div>

                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: '0.5px solid #e0e0e0', borderRadius: 8, background: '#f8f8f8', minWidth: 0 }}>
                    <option value="All">All accounts</option>
                    {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: '0.5px solid #e0e0e0', borderRadius: 8, background: '#f8f8f8', minWidth: 0 }}>
                    <option value="All">All months</option>
                    {Array.from(new Set(txns.map(t => t.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)).map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
              </div>
              {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>Loading…</div>}
              {!loading && txns.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#555', marginBottom: 16 }}>No transactions yet</div>
                  <button onClick={connectBank} style={{ fontSize: 13, padding: '10px 20px', borderRadius: 20, border: 'none', background: '#1a1a1a', color: 'white', cursor: 'pointer' }}>Connect Bank</button>
                </div>
              )}
              {!loading && txnsByMonth.map(([month, mTxns]) => {
                const total = mTxns.reduce((s, t) => s + myShare(t), 0);
                return (
                  <div key={month} style={{ marginBottom: 8 }}>
                    <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{monthLabel(month)}</div>
                      <span style={{ fontSize: 12, color: '#aaa' }}>{fmt(total)}</span>
                    </div>
                    <div style={{ padding: '0 20px' }}>
                      {mTxns.map(t => <TxnCard key={t.id} t={t} updateField={updateField} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'balances' && (
            <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 24 }}>Balances</div>
              {displayPositive.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Assets</div>
                  {displayPositive.map(a => (
                    <div key={a.account_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, textTransform: 'capitalize' }}>{a.subtype}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#3A5068' }}>{fmt(a.balances.current || 0)}</div>
                    </div>
                  ))}
                  <div style={{ marginBottom: 28 }} />
                </>
              )}
              {(displayNegative.length > 0 || manualWithBalance.length > 0) && (
                <>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Debts</div>
                  {displayNegative.map(a => (
                    <div key={a.account_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2, textTransform: 'capitalize' }}>{a.subtype}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#683A52' }}>{fmt(a.balances.current || 0)}</div>
                    </div>
                  ))}
                  {manualWithBalance.map(ma => (
                    <div key={ma.id} style={{ padding: '14px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{ma.name}</div>
                          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>manual · credit card</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#683A52' }}>{fmt(ma.effectiveBalance)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: '#aaa' }}>Base balance:</span>
                        <input type="number" defaultValue={ma.balance} key={ma.id + '-' + ma.balance}
                          onBlur={async e => {
                            await fetch('/api/manual-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_balance', id: ma.id, balance: parseFloat(e.target.value) || 0, balance_date: today }) });
                            fetchManualAccounts();
                          }}
                          style={{ fontSize: 13, padding: '4px 8px', border: '0.5px solid #e0e0e0', borderRadius: 8, width: 100 }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'budget' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Budget</div>
                <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3 }}>
                  {(['maddie', 'joint'] as const).map(sub => (
                    <button key={sub} onClick={() => setBudgetSubtab(sub)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: budgetSubtab === sub ? 'white' : 'transparent',
                      color: budgetSubtab === sub ? '#1a1a1a' : '#888',
                      fontWeight: budgetSubtab === sub ? 600 : 400,
                      fontSize: 13,
                      boxShadow: budgetSubtab === sub ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>{sub === 'maddie' ? 'Maddie' : 'Joint'}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '0 20px' }}>
                {budgetSubtab === 'maddie' && <BudgetAccount title="Maddie — personal" bills={maddieBills} income={maddieIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('maddie')} onAddIncome={handleAddIncome('maddie')} />}
                {budgetSubtab === 'joint' && <BudgetAccount title="Joint account" bills={jointBills} income={jointIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('joint')} onAddIncome={handleAddIncome('joint')} />}
              </div>
            </div>
          )}

          {tab === 'summary' && (
            <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Summary</div>
                <button onClick={connectBank} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>{linked ? 'Reconnect' : 'Connect'}</button>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Year to Date</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Spending</div><div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{fmt(ytdStats.total)}</div></div>
                <div><div style={{ fontSize: 10, color: '#2A6030', marginBottom: 4 }}>Income</div><div style={{ fontSize: 22, fontWeight: 700, color: '#2A6030' }}>{fmt(ytdStats.income)}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
                <div><div style={{ fontSize: 10, color: catColors['Needs'].color, marginBottom: 4 }}>Needs</div><div style={{ fontSize: 18, fontWeight: 700, color: catColors['Needs'].color }}>{fmt(ytdStats.needs)}</div></div>
                <div><div style={{ fontSize: 10, color: catColors['Wants'].color, marginBottom: 4 }}>Wants</div><div style={{ fontSize: 18, fontWeight: 700, color: catColors['Wants'].color }}>{fmt(ytdStats.wants)}</div></div>
                <div><div style={{ fontSize: 10, color: catColors['Impulse'].color, marginBottom: 4 }}>Impulse</div><div style={{ fontSize: 18, fontWeight: 700, color: catColors['Impulse'].color }}>{fmt(ytdStats.impulse)}</div></div>
              </div>
              <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Net Worth</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Assets</div><div style={{ fontSize: 18, fontWeight: 700, color: '#3A5068' }}>{fmt(positiveAccounts.reduce((s, a) => s + (a.balances.current || 0), 0))}</div></div>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Debts</div><div style={{ fontSize: 18, fontWeight: 700, color: '#683A52' }}>{fmt(negativeAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) + manualDebt)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Net</div><div style={{ fontSize: 18, fontWeight: 700, color: netWorth >= 0 ? '#3A6850' : '#b04040' }}>{fmtSigned(netWorth)}</div></div>
                </div>
              </div>
              <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Breakdown</div>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #e0e0e0', borderRadius: 8, background: 'white', color: '#1a1a1a' }}>
                    <option value="">Select month</option>
                    {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
                {selectedMonth && (
                  <div>
                    {[
                      { label: 'Income', value: monthlyStats.income, color: '#2A6030' },
                      { label: 'Spending', value: monthlyStats.total, color: '#1a1a1a' },
                      { label: 'Needs', value: monthlyStats.needs, color: catColors['Needs'].color },
                      { label: 'Wants', value: monthlyStats.wants, color: catColors['Wants'].color },
                      { label: 'Impulse', value: monthlyStats.impulse, color: catColors['Impulse'].color },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                        <span style={{ fontSize: 14, color: '#888' }}>{row.label}</span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: row.color }}>{fmt(row.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'archive' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))', overflowX: 'hidden', width: '100%' }}>
              <div style={{ padding: '0 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Archive</div>
                <input placeholder="Search transactions..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                  style={{ width: '100%', fontSize: 14, padding: '10px 14px', border: '0.5px solid #e0e0e0', borderRadius: 10, background: '#f8f8f8', boxSizing: 'border-box' as const }} />
              </div>
              {filteredArchive.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>No archived transactions.</div>}
              <div style={{ padding: '0 20px' }}>
                {filteredArchive.map(t => <ArchiveCard key={t.id} t={t} onRecover={recoverTxn} />)}
              </div>
            </div>
          )}

        </div>

        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid #efefef',
          paddingBottom: 'env(safe-area-inset-bottom)',
          display: 'flex', justifyContent: 'space-evenly', alignItems: 'center',
          height: TAB_H, zIndex: 100,
        }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? '#1a1a1a' : '#bbb',
              padding: '8px 12px',
            }}>
              <Icon />
              <span style={{ fontSize: 10, fontWeight: tab === id ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}