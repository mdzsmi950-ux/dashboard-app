'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Txn, Account, Bill, BudgetIncome, ManualAccount, Category, Label } from './components/types';
import { fmt, fmtSigned, today, myShare, incomeShare, catColors, labelColors, monthLabel } from './components/constants';
import BudgetAccount from './components/BudgetAccount';

// ── Icons ──────────────────────────────────────────────────────────────────
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
  { id: 'summary', label: 'Summary', Icon: IconSummary },
  { id: 'transactions', label: 'Transactions', Icon: IconTxn },
  { id: 'balances', label: 'Balances', Icon: IconBalance },
  { id: 'budget', label: 'Budget', Icon: IconBudget },
  { id: 'archive', label: 'Archive', Icon: IconArchive },
];

const pill = (active: boolean, colors: { bg: string; border: string; color: string }) => ({
  fontSize: 11, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
  border: `0.5px solid ${active ? colors.border : '#e8e8e8'}`,
  background: active ? colors.bg : 'transparent',
  color: active ? colors.color : '#bbb',
  fontWeight: active ? 500 : 400,
} as const);

function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const onTouchStart = (e: TouchEvent) => { startY.current = e.touches[0].clientY; };
    const onTouchEnd = async (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80 && node.scrollTop === 0) { setPulling(true); await onRefresh(); setPulling(false); }
    };
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { node.removeEventListener('touchstart', onTouchStart); node.removeEventListener('touchend', onTouchEnd); };
  }, [onRefresh]);
  return { el, pulling };
}

function StatCard({ label, value, bg, color, border }: { label: string; value: number; bg: string; color: string; border?: string }) {
  return (
    <div style={{ background: bg, borderRadius: 16, padding: '14px 16px', border: border ? `0.5px solid ${border}` : 'none' }}>
      <div style={{ fontSize: 10, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{fmt(value)}</div>
    </div>
  );
}

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
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['Maddie', 'Nick', 'Joint', 'Ignore'] as Label[]).map(l => (
          <button key={l} onClick={(e) => { e.preventDefault(); updateField(t.id, 'label', l); }} style={pill(t.label === l, labelColors[l])}>{l}</button>
        ))}
        <span style={{ color: '#e8e8e8', fontSize: 11, padding: '3px 2px' }}>·</span>
        {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
          const disabled = t.label === 'Nick' || t.label === 'Ignore' || !t.label;
          return <button key={cat} onClick={(e) => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }} style={pill(!disabled && t.category === cat, catColors[cat])}>{cat}</button>;
        })}
      </div>
    </div>
  );
}

function ArchiveCard({ t }: { t: Txn }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '0.5px solid #f0f0f0' }}>
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
    try { const d = await fetch('/api/transactions').then(r => r.json()); setTxns(d); localStorage.setItem('cache_txns', JSON.stringify(d)); } catch {}
    setLoading(false);
  };
  const fetchAccounts = async () => {
    try { const d = await fetch('/api/balances').then(r => r.json()); setAccounts(d); localStorage.setItem('cache_accounts', JSON.stringify(d)); } catch {}
  };
  const fetchManualAccounts = async () => {
    try { const d = await fetch('/api/manual-accounts').then(r => r.json()); setManualAccountsDb(d); } catch {}
  };
  const fetchBudget = useCallback(async () => {
    try { const { bills, income } = await fetch('/api/budget').then(r => r.json()); setBills(bills); setIncome(income); } catch {}
  }, []);
  const fetchArchived = useCallback(async () => {
    try { const d = await fetch('/api/transactions/archived').then(r => r.json()); setArchivedTxns(d); localStorage.setItem('cache_archived', JSON.stringify(d)); } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchTxns(), fetchAccounts(), fetchArchived(), fetchManualAccounts()]);
  }, [fetchArchived]);

  useEffect(() => { fetchBudget(); fetchArchived(); fetchAccounts(); fetchManualAccounts(); }, [fetchBudget, fetchArchived]);

  const { el: scrollRef, pulling } = usePullToRefresh(refreshAll);

  const connectBank = async () => {
    const { link_token } = await fetch('/api/create-link-token', { method: 'POST' }).then(r => r.json());
    const handler = (window as any).Plaid.create({
      token: link_token,
      onSuccess: async (public_token: string) => {
        await fetch('/api/exchange-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token }) });
        setLinked(true); refreshAll();
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

  const budgetApi = async (action: string, table: string, data: any) => {
    await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, table, data }) });
    fetchBudget();
  };

  const allTxns = useMemo(() => {
    const seen = new Set<string>();
    return [...txns, ...archivedTxns].filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
  }, [txns, archivedTxns]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTxns.forEach(t => months.add(t.date.slice(0, 7)));
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [allTxns]);

  // YTD stats (always full year)
  const ytdStats = useMemo(() => ({
    total: allTxns.reduce((s, t) => s + myShare(t), 0),
    income: allTxns.reduce((s, t) => s + incomeShare(t), 0),
    needs: allTxns.filter(t => t.category === 'Needs').reduce((s, t) => s + myShare(t), 0),
    wants: allTxns.filter(t => t.category === 'Wants').reduce((s, t) => s + myShare(t), 0),
    impulse: allTxns.filter(t => t.category === 'Impulse').reduce((s, t) => s + myShare(t), 0),
  }), [allTxns]);

  // Monthly stats (filtered by selected month)
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

  const txnsByMonth = useMemo(() => {
    const map: Record<string, Txn[]> = {};
    txns.forEach(t => { const m = t.date.slice(0, 7); if (!map[m]) map[m] = []; map[m].push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txns]);

  const isFullyLabeled = (mTxns: Txn[]) => mTxns.every(t => t.label !== null);
  const labelArchivedMonths = useMemo(() => { const s = new Set<string>(); archivedTxns.forEach(t => s.add(t.date.slice(0, 7))); return s; }, [archivedTxns]);
  const isFullyCategorized = (mTxns: Txn[]) => mTxns.every(t => t.category !== null || t.label === 'Ignore' || t.label === 'Nick');

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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

        {pulling && <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: '#aaa' }}>Refreshing…</div>}

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: TAB_H + 16 }}>

          {/* ── SUMMARY TAB ── */}
          {tab === 'summary' && (
            <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Summary</div>
                <button onClick={connectBank} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>
                  {linked ? 'Reconnect' : 'Connect'}
                </button>
              </div>

              {/* YTD cards — always full year */}
              <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Year to Date</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <StatCard label="Spending" value={ytdStats.total} bg="#f8f8f8" color="#1a1a1a" />
                <StatCard label="Income" value={ytdStats.income} bg="#E8F4E8" color="#2A6030" border="#A0D0A0" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 28 }}>
                <StatCard label="Needs" value={ytdStats.needs} bg={catColors['Needs'].bg} color={catColors['Needs'].color} border={catColors['Needs'].border} />
                <StatCard label="Wants" value={ytdStats.wants} bg={catColors['Wants'].bg} color={catColors['Wants'].color} border={catColors['Wants'].border} />
                <StatCard label="Impulse" value={ytdStats.impulse} bg={catColors['Impulse'].bg} color={catColors['Impulse'].color} border={catColors['Impulse'].border} />
              </div>

              {/* Net worth */}
              <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Net Worth</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Assets</div><div style={{ fontSize: 18, fontWeight: 700, color: '#3A5068' }}>{fmt(positiveAccounts.reduce((s, a) => s + (a.balances.current || 0), 0))}</div></div>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Debts</div><div style={{ fontSize: 18, fontWeight: 700, color: '#683A52' }}>{fmt(negativeAccounts.reduce((s, a) => s + (a.balances.current || 0), 0) + manualDebt)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Net</div><div style={{ fontSize: 18, fontWeight: 700, color: netWorth >= 0 ? '#3A6850' : '#b04040' }}>{fmtSigned(netWorth)}</div></div>
                </div>
              </div>

              {/* Month breakdown */}
              <div style={{ borderTop: '0.5px solid #f0f0f0', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly Breakdown</div>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    style={{ fontSize: 13, padding: '6px 10px', border: '0.5px solid #e0e0e0', borderRadius: 8, background: 'white', color: '#1a1a1a', cursor: 'pointer' }}>
                    <option value="">Select month</option>
                    {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
                {selectedMonth && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <StatCard label="Spending" value={monthlyStats.total} bg="#f8f8f8" color="#1a1a1a" />
                      <StatCard label="Income" value={monthlyStats.income} bg="#E8F4E8" color="#2A6030" border="#A0D0A0" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <StatCard label="Needs" value={monthlyStats.needs} bg={catColors['Needs'].bg} color={catColors['Needs'].color} border={catColors['Needs'].border} />
                      <StatCard label="Wants" value={monthlyStats.wants} bg={catColors['Wants'].bg} color={catColors['Wants'].color} border={catColors['Wants'].border} />
                      <StatCard label="Impulse" value={monthlyStats.impulse} bg={catColors['Impulse'].bg} color={catColors['Impulse'].color} border={catColors['Impulse'].border} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS TAB ── */}
          {tab === 'transactions' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>Transactions</div>
                <button onClick={() => refreshAll()} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 20, border: '0.5px solid #e0e0e0', background: 'white', color: '#555', cursor: 'pointer' }}>Refresh</button>
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
                const allLabeled = isFullyLabeled(mTxns);
                const allCategorized = isFullyCategorized(mTxns);
                return (
                  <div key={month} style={{ marginBottom: 8 }}>
                    <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>{monthLabel(month)}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#aaa' }}>{fmt(total)}</span>
                        {allLabeled && !labelArchivedMonths.has(month) && (
                          <button onClick={() => archiveMonth(month, 'label')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '0.5px solid #B0C0D0', background: '#E8EEF4', color: '#3A5068', cursor: 'pointer' }}>Label ✓</button>
                        )}
                        {allCategorized && labelArchivedMonths.has(month) && (
                          <button onClick={() => archiveMonth(month, 'category')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '0.5px solid #B0D0BC', background: '#E8F4EE', color: '#3A6850', cursor: 'pointer' }}>Cat ✓</button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '0 20px' }}>
                      {mTxns.map(t => <TxnCard key={t.id} t={t} updateField={updateField} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BALANCES TAB ── */}
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

          {/* ── BUDGET TAB ── */}
          {tab === 'budget' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Budget</div>
                <div style={{ display: 'flex', gap: 0, background: '#f5f5f5', borderRadius: 10, padding: 3 }}>
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
                {budgetSubtab === 'maddie' && (
                  <BudgetAccount title="Maddie — personal" bills={maddieBills} income={maddieIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('maddie')} onAddIncome={handleAddIncome('maddie')} />
                )}
                {budgetSubtab === 'joint' && (
                  <BudgetAccount title="Joint account" bills={jointBills} income={jointIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('joint')} onAddIncome={handleAddIncome('joint')} />
                )}
              </div>
            </div>
          )}

          {/* ── ARCHIVE TAB ── */}
          {tab === 'archive' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Archive</div>
                <input
                  placeholder="Search transactions..."
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  style={{ width: '100%', fontSize: 14, padding: '10px 14px', border: '0.5px solid #e0e0e0', borderRadius: 10, background: '#f8f8f8', boxSizing: 'border-box' as const }}
                />
              </div>
              {filteredArchive.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>No results.</div>}
              {(() => {
                const byMonth: Record<string, Txn[]> = {};
                filteredArchive.forEach(t => { const m = t.date.slice(0, 7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(t); });
                return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mTxns]) => (
                  <div key={month}>
                    <div style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#555' }}>{monthLabel(month)}</div>
                    <div style={{ padding: '0 20px' }}>
                      {mTxns.map(t => <ArchiveCard key={t.id} t={t} />)}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

        </div>

        {/* ── Bottom Tab Bar ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid #efefef',
          paddingBottom: 'env(safe-area-inset-bottom)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
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