'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Txn, Bill, BudgetIncome, ManualAccount, Category, Label } from './components/types';
import { fmt, myShare, incomeShare, catColors, labelColors, monthLabel, today } from './components/constants';
import BudgetAccount from './components/BudgetAccount';

const IconTxn = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconBudget = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
);
const IconSummary = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const TABS = [
  { id: 'transactions', label: 'Transactions', Icon: IconTxn },
  { id: 'budget',       label: 'Budget',       Icon: IconBudget },
  { id: 'summary',      label: 'Summary',      Icon: IconSummary },
];

const isCompleteForArchive = (t: Txn) =>
  t.label === 'Ignore' || ((t.label === 'Mine' || t.label === 'Joint') && t.category !== null);

const pill = (active: boolean, colors: { bg: string; border: string; color: string }) => ({
  fontSize: 11, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
  border: `0.5px solid ${active ? colors.border : '#e8e8e8'}`,
  background: active ? colors.bg : 'transparent',
  color: active ? colors.color : '#bbb',
  fontWeight: active ? 500 : 400,
} as const);

function TxnCard({ t, updateField }: { t: Txn; updateField: (id: string, f: string, v: any) => void }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '0.5px solid #f0f0f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.date.slice(5)}{t.account ? ` · ${t.account}` : ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.amount < 0 ? '#3A6850' : '#1a1a1a' }}>
            {t.amount < 0 ? '+' : ''}{fmt(t.amount)}
          </div>
          <button onClick={e => { e.preventDefault(); updateField(t.id, 'label', 'Ignore'); }} style={pill(t.label === 'Ignore', labelColors['Ignore'])}>Ignore</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {(['Mine', 'Joint'] as Label[]).map(l => (
          <button key={l} onClick={e => { e.preventDefault(); updateField(t.id, 'label', l); }} style={pill(t.label === l, labelColors[l])}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
          const disabled = t.label === 'Ignore' || !t.label;
          return (
            <button key={cat} onClick={e => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }}
              style={pill(!disabled && t.category === cat, catColors[cat])}>{cat}</button>
          );
        })}
      </div>
    </div>
  );
}

function ArchiveCard({ t, onRecover }: { t: Txn; onRecover: (t: Txn) => void }) {
  const startX = useRef<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const threshold = 80;
  const swiping = swipeX > 10;
  const ready = swipeX >= threshold;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '0.5px solid #f0f0f0' }}>
      <div style={{
        position: 'absolute', inset: 0, background: ready ? '#c0392b' : '#e88',
        display: 'flex', alignItems: 'center', paddingLeft: 20,
        opacity: swiping ? 1 : 0, transition: 'background 0.15s',
      }}>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>↩ Recover</span>
      </div>
      <div
        style={{ padding: '12px 0', background: '#fff', transform: `translateX(${Math.min(swipeX, threshold + 20)}px)`, transition: swiping ? 'none' : 'transform 0.2s' }}
        onTouchStart={e => { startX.current = e.touches[0].clientX; setSwipeX(0); }}
        onTouchMove={e => { if (startX.current === null) return; const dx = e.touches[0].clientX - startX.current; if (dx > 0) setSwipeX(dx); }}
        onTouchEnd={e => {
          if (startX.current !== null && e.changedTouches[0].clientX - startX.current >= threshold) onRecover(t);
          setSwipeX(0); startX.current = null;
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {t.label && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: labelColors[t.label].bg, color: labelColors[t.label].color }}>{t.label}</span>}
              {t.category && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: catColors[t.category].bg, color: catColors[t.category].color }}>{t.category}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.amount < 0 ? '#3A6850' : '#1a1a1a' }}>{t.amount < 0 ? '+' : ''}{fmt(t.amount)}</div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{t.date.slice(5)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [archivedTxns, setArchivedTxns] = useState<Txn[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [income, setIncome] = useState<BudgetIncome[]>([]);
  const [manualAccountsDb, setManualAccountsDb] = useState<ManualAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('transactions');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [budgetSubtab, setBudgetSubtab] = useState<'maddie' | 'joint'>('maddie');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [showArchive, setShowArchive] = useState(false);
  const [uploadModal, setUploadModal] = useState<{ file: File; source: string } | null>(null);
  const [uploadAccount, setUploadAccount] = useState('');

  useEffect(() => {
    try {
      const t = localStorage.getItem('cache_txns'); if (t) setTxns(JSON.parse(t));
      const a = localStorage.getItem('cache_archived'); if (a) setArchivedTxns(JSON.parse(a));
      const b = localStorage.getItem('cache_bills'); if (b) setBills(JSON.parse(b));
      const inc = localStorage.getItem('cache_income'); if (inc) setIncome(JSON.parse(inc));
    } catch {}
  }, []);

  const fetchFromSupabase = async () => {
    setLoading(true);
    try { const d = await fetch('/api/transactions/saved').then(r => r.json()); const s = Array.isArray(d) ? d : []; setTxns(s); localStorage.setItem('cache_txns', JSON.stringify(s)); } catch {}
    setLoading(false);
  };

  const fetchArchived = useCallback(async () => {
    try { const d = await fetch('/api/transactions/archived').then(r => r.json()); const s = Array.isArray(d) ? d : []; setArchivedTxns(s); localStorage.setItem('cache_archived', JSON.stringify(s)); } catch {}
  }, []);

  const fetchManualAccounts = async () => {
    try { const d = await fetch('/api/manual-accounts').then(r => r.json()); setManualAccountsDb(Array.isArray(d) ? d : []); } catch {}
  };

  const fetchBudget = useCallback(async () => {
    try { const d = await fetch('/api/budget').then(r => r.json()); setBills(Array.isArray(d?.bills) ? d.bills : []); setIncome(Array.isArray(d?.income) ? d.income : []); } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchFromSupabase(), fetchArchived(), fetchManualAccounts(), fetchBudget()]);
      const lastSync = localStorage.getItem('last_plaid_sync');
      const todayStr = new Date().toISOString().split('T')[0];
      if (lastSync !== todayStr) {
        try { await fetch('/api/transactions'); } catch {}
        localStorage.setItem('last_plaid_sync', todayStr);
        fetchFromSupabase();
        fetchArchived();
      }
    };
    init();
  }, [fetchBudget, fetchArchived]);

  const updateField = async (id: string, field: string, val: any) => {
    const txn = txns.find(t => t.id === id);
    if (!txn) return;
    const updated: Txn = { ...txn, [field]: val, ...(field === 'label' && val === 'Ignore' ? { category: null } : {}) };
    const shouldArchive = isCompleteForArchive(updated);
    if (shouldArchive) {
      setTxns(prev => prev.filter(t => t.id !== id));
      setArchivedTxns(prev => [{ ...updated, archived: true }, ...prev]);
    } else {
      setTxns(prev => prev.map(t => t.id === id ? updated : t));
    }
    await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field, val }) });
    if (field === 'label' && val === 'Ignore') {
      await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field: 'category', val: null }) });
    }
    if (shouldArchive) {
      await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, field: 'archived', val: true }) });
    }
  };

  const recoverTxn = async (txn: Txn) => {
    setArchivedTxns(prev => prev.filter(t => t.id !== txn.id));
    setTxns(prev => [{ ...txn, archived: false }, ...prev]);
    await fetch('/api/transactions/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: txn.id, field: 'archived', val: false }) });
  };

  const budgetApi = async (action: string, table: string, data: any) => {
    await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, table, data }) });
    fetchBudget();
  };
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

  const allTxns = useMemo(() => {
    const seen = new Set<string>();
    return [...txns, ...archivedTxns].filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [txns, archivedTxns]);

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    allTxns.forEach(t => s.add(t.date.slice(0, 7)));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [allTxns]);

  const ytdStats = useMemo(() => ({
    total:   allTxns.reduce((s, t) => s + myShare(t), 0),
    income:  allTxns.reduce((s, t) => s + incomeShare(t), 0),
    needs:   allTxns.filter(t => t.category === 'Needs').reduce((s, t) => s + myShare(t), 0),
    wants:   allTxns.filter(t => t.category === 'Wants').reduce((s, t) => s + myShare(t), 0),
    impulse: allTxns.filter(t => t.category === 'Impulse').reduce((s, t) => s + myShare(t), 0),
  }), [allTxns]);

  const monthlyTxns = useMemo(() => selectedMonth ? allTxns.filter(t => t.date.startsWith(selectedMonth)) : [], [allTxns, selectedMonth]);

  const monthlyStats = useMemo(() => ({
    total:   monthlyTxns.reduce((s, t) => s + myShare(t), 0),
    income:  monthlyTxns.reduce((s, t) => s + incomeShare(t), 0),
    needs:   monthlyTxns.filter(t => t.category === 'Needs').reduce((s, t) => s + myShare(t), 0),
    wants:   monthlyTxns.filter(t => t.category === 'Wants').reduce((s, t) => s + myShare(t), 0),
    impulse: monthlyTxns.filter(t => t.category === 'Impulse').reduce((s, t) => s + myShare(t), 0),
  }), [monthlyTxns]);

  const accountOptions = useMemo(() =>
    Array.from(new Set(txns.map(t => t.account).filter(Boolean))).sort() as string[], [txns]);

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

  const filteredArchive = useMemo(() =>
    archiveSearch.trim() ? archivedTxns.filter(t => t.merchant.toLowerCase().includes(archiveSearch.toLowerCase())) : archivedTxns,
    [archivedTxns, archiveSearch]);

  const maddieBills  = bills.filter(b => b.account === 'maddie');
  const maddieIncome = income.filter(p => p.account === 'maddie');
  const jointBills   = bills.filter(b => b.account === 'joint');
  const jointIncome  = income.filter(p => p.account === 'joint');

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
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowArchive(true)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>Archive</button>
                    <label style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>
                      + CSV
                      <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const name = file.name.toLowerCase();
                        const src = (name.includes('amex') || name.includes('activity') || name.includes('gold') || name.includes('blue')) ? 'amex' : 'chase';
                        setUploadModal({ file, source: src });
                        setUploadAccount(manualAccountsDb[0]?.name || '');
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
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
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#555' }}>No transactions yet</div>
                </div>
              )}
              {!loading && txnsByMonth.map(([month, mTxns]) => (
                <div key={month} style={{ marginBottom: 8 }}>
                  <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{monthLabel(month)}</div>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{fmt(mTxns.reduce((s, t) => s + myShare(t), 0))}</span>
                  </div>
                  <div style={{ padding: '0 20px' }}>
                    {mTxns.map(t => <TxnCard key={t.id} t={t} updateField={updateField} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'budget' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Budget</div>
                <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3 }}>
                  {(['maddie', 'joint'] as const).map(sub => (
                    <button key={sub} onClick={() => setBudgetSubtab(sub)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                      background: budgetSubtab === sub ? 'white' : 'transparent',
                      color: budgetSubtab === sub ? '#1a1a1a' : '#888',
                      fontWeight: budgetSubtab === sub ? 600 : 400,
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
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 20 }}>Summary</div>
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Year to Date</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Spending</div><div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{fmt(ytdStats.total)}</div></div>
                <div><div style={{ fontSize: 10, color: '#2A6030', marginBottom: 4 }}>Income</div><div style={{ fontSize: 22, fontWeight: 700, color: '#2A6030' }}>{fmt(ytdStats.income)}</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
                {(['Needs', 'Wants', 'Impulse'] as Category[]).map(cat => (
                  <div key={cat}>
                    <div style={{ fontSize: 10, color: catColors[cat].color, marginBottom: 4 }}>{cat}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: catColors[cat].color }}>
                      {fmt(cat === 'Needs' ? ytdStats.needs : cat === 'Wants' ? ytdStats.wants : ytdStats.impulse)}
                    </div>
                  </div>
                ))}
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
                      { label: 'Income',   value: monthlyStats.income,  color: '#2A6030' },
                      { label: 'Spending', value: monthlyStats.total,   color: '#1a1a1a' },
                      { label: 'Needs',    value: monthlyStats.needs,   color: catColors['Needs'].color },
                      { label: 'Wants',    value: monthlyStats.wants,   color: catColors['Wants'].color },
                      { label: 'Impulse',  value: monthlyStats.impulse, color: catColors['Impulse'].color },
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

          {showArchive && (
            <div style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 150, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))', marginBottom: 12, borderBottom: '0.5px solid #f0f0f0', paddingBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Archive</div>
                  <button onClick={() => setShowArchive(false)} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>Done</button>
                </div>
                <input placeholder="Search transactions..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                  style={{ width: '100%', fontSize: 14, padding: '10px 14px', border: '0.5px solid #e0e0e0', borderRadius: 10, background: '#f8f8f8', boxSizing: 'border-box' as const }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', paddingBottom: 40 }}>
                {filteredArchive.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>No archived transactions.</div>}
                {filteredArchive.map(t => <ArchiveCard key={t.id} t={t} onRecover={t => { recoverTxn(t); }} />)}
              </div>
            </div>
          )}

        </div>

        {uploadModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: 'white', width: '100%', borderRadius: '16px 16px 0 0', padding: '24px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Upload {uploadModal.source === 'amex' ? 'Amex' : 'Chase'} CSV</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Select account to import into</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {manualAccountsDb.map(a => (
                  <button key={a.id} onClick={() => setUploadAccount(a.name)} style={{
                    padding: '12px 16px', borderRadius: 10, textAlign: 'left', fontSize: 14, cursor: 'pointer',
                    border: uploadAccount === a.name ? '1.5px solid #1a1a1a' : '0.5px solid #e0e0e0',
                    background: uploadAccount === a.name ? '#f5f5f5' : 'white',
                    fontWeight: uploadAccount === a.name ? 600 : 400,
                  }}>{a.name}</button>
                ))}
                <button onClick={() => { const n = prompt('New account name?'); if (n) setUploadAccount(n); }} style={{
                  padding: '12px 16px', borderRadius: 10, textAlign: 'left', fontSize: 14, color: '#888', cursor: 'pointer',
                  border: uploadAccount && !manualAccountsDb.find(a => a.name === uploadAccount) ? '1.5px solid #1a1a1a' : '0.5px dashed #ccc',
                  background: 'white',
                }}>+ New account{uploadAccount && !manualAccountsDb.find(a => a.name === uploadAccount) ? `: ${uploadAccount}` : ''}</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setUploadModal(null)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: '0.5px solid #e0e0e0', background: 'white', fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                <button disabled={!uploadAccount} onClick={async () => {
                  const csv = await uploadModal.file.text();
                  const r = await fetch('/api/transactions/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, source: uploadModal.source, accountName: uploadAccount }) }).then(r => r.json());
                  setUploadModal(null);
                  alert('Inserted: ' + r.inserted + ', Skipped: ' + r.skipped);
                  fetchFromSupabase(); fetchArchived(); fetchManualAccounts();
                }} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: uploadAccount ? '#1a1a1a' : '#ccc', color: 'white', fontSize: 15, fontWeight: 600, cursor: uploadAccount ? 'pointer' : 'default' }}>
                  Import{uploadAccount ? ' to ' + uploadAccount : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid #efefef', paddingBottom: 'env(safe-area-inset-bottom)',
          display: 'flex', justifyContent: 'space-evenly', alignItems: 'center',
          height: TAB_H, zIndex: 100,
        }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? '#1a1a1a' : '#bbb', padding: '8px 12px',
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