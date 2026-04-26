'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Txn, Bill, BudgetIncome, ManualAccount, Category, Label } from './components/types';
import { fmt, myShare, incomeShare, catColors, labelColors, monthLabel, today, theme } from './components/constants';
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
  border: `0.5px solid ${active ? colors.border : theme.pillBorder}`,
  background: active ? colors.bg : 'transparent',
  color: active ? colors.color : theme.textDisabled,
  fontWeight: active ? 500 : 400,
} as const);

function TxnCard({ t, updateField }: { t: Txn; updateField: (id: string, f: string, v: any) => void }) {
  const startX = useRef<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const threshold = 80;
  const swiping = swipeX > 10;
  const ready = swipeX >= threshold;

  const solidPill = (active: boolean, colors: { bg: string; border: string; color: string }) => ({
    fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
    border: `0.5px solid ${active ? colors.border : theme.pillBorder}`,
    background: active ? colors.bg : 'transparent',
    color: active ? colors.color : theme.textDisabled,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  } as const);

  const solidCatPill = (active: boolean, colors: { bg: string; border: string; color: string }) => ({
    fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
    border: `0.5px solid ${active ? colors.border : theme.pillBorder}`,
    background: active ? colors.bg : 'transparent',
    color: active ? colors.color : theme.textDisabled,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  } as const);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: `0.5px solid ${theme.divider}` }}>
      {/* Swipe-to-ignore background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: ready ? theme.textMid : theme.textDisabled,
        display: 'flex', alignItems: 'center', paddingLeft: 20,
        opacity: swiping ? 1 : 0, transition: 'background 0.15s',
      }}>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Ignore</span>
      </div>
      <div
        style={{ padding: '12px 0', background: 'transparent', transform: `translateX(${Math.min(swipeX, threshold + 20)}px)`, transition: swiping ? 'none' : 'transform 0.2s' }}
        onTouchStart={e => { startX.current = e.touches[0].clientX; setSwipeX(0); }}
        onTouchMove={e => { if (startX.current === null) return; const dx = e.touches[0].clientX - startX.current; if (dx > 0) setSwipeX(dx); }}
        onTouchEnd={e => {
          if (startX.current !== null && e.changedTouches[0].clientX - startX.current >= threshold) {
            updateField(t.id, 'label', 'Ignore');
          }
          setSwipeX(0); startX.current = null;
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
            <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 2 }}>{t.date.slice(5)}{t.account ? ` · ${t.account}` : ''}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.amount < 0 ? theme.accent : theme.text, flexShrink: 0 }}>
            {t.amount < 0 ? '+' : ''}{fmt(t.amount)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {(['Mine', 'Joint'] as Label[]).map(l => (
            <button key={l} onClick={e => { e.preventDefault(); updateField(t.id, 'label', l); }}
              style={solidPill(t.label === l, labelColors[l])}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
            const disabled = !t.label || t.label === 'Ignore';
            return (
              <button key={cat} onClick={e => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }}
                style={solidCatPill(!disabled && t.category === cat, catColors[cat])}>{cat}</button>
            );
          })}
        </div>
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
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: `0.5px solid ${theme.divider}` }}>
      <div style={{
        position: 'absolute', inset: 0, background: ready ? theme.secondary : theme.secondaryLight,
        display: 'flex', alignItems: 'center', paddingLeft: 20,
        opacity: swiping ? 1 : 0, transition: 'background 0.15s',
      }}>
        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>↩ Recover</span>
      </div>
      <div
        style={{ padding: '12px 0', background: 'transparent', transform: `translateX(${Math.min(swipeX, threshold + 20)}px)`, transition: swiping ? 'none' : 'transform 0.2s' }}
        onTouchStart={e => { startX.current = e.touches[0].clientX; setSwipeX(0); }}
        onTouchMove={e => { if (startX.current === null) return; const dx = e.touches[0].clientX - startX.current; if (dx > 0) setSwipeX(dx); }}
        onTouchEnd={e => {
          if (startX.current !== null && e.changedTouches[0].clientX - startX.current >= threshold) onRecover(t);
          setSwipeX(0); startX.current = null;
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {t.label && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: labelColors[t.label].bg, color: labelColors[t.label].color }}>{t.label}</span>}
              {t.category && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: catColors[t.category].bg, color: catColors[t.category].color }}>{t.category}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.amount < 0 ? theme.accent : theme.text }}>{t.amount < 0 ? '+' : ''}{fmt(t.amount)}</div>
            <div style={{ fontSize: 11, color: theme.textFaint, marginTop: 2 }}>{t.date.slice(5)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieChart({ needs, wants, impulse }: { needs: number; wants: number; impulse: number }) {
  const total = needs + wants + impulse;
  if (total === 0) return null;

  const cx = 80, cy = 80, r = 70;
  const slices = [
    { value: needs,   color: theme.accent, label: 'Needs' },
    { value: wants,   color: theme.wants, label: 'Wants' },
    { value: impulse, color: theme.secondary, label: 'Impulse' },
  ].filter(s => s.value > 0);

  let angle = -Math.PI / 2;
  const paths = slices.map(s => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...s, d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, pct: Math.round(s.value / total * 100) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85}/>)}
        <circle cx={cx} cy={cy} r={28} fill="white"/>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 12, color: theme.textMid, fontWeight: 500 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: theme.textFaint }}>{p.pct}% · ${p.value.toFixed(0)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpendingChart({ data }: { data: any }) {
  const W = 335, H = 180, PAD = { top: 10, right: 10, bottom: 24, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = [...data.current, ...data.last].filter(v => v > 0);
  const maxVal = allVals.length ? Math.max(...allVals) * 1.1 : 100;
  const maxDays = Math.max(data.daysInCur, data.daysInLast);

  const toX = (day: number, totalDays: number) => PAD.left + ((day - 1) / (totalDays - 1)) * chartW;
  const toY = (val: number) => PAD.top + chartH - (val / maxVal) * chartH;

  const makePath = (vals: number[], totalDays: number, limit?: number) => {
    const pts = vals.slice(0, limit || vals.length);
    if (!pts.length) return '';
    return pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i + 1, totalDays).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  };

  const makeArea = (vals: number[], totalDays: number, limit?: number) => {
    const path = makePath(vals, totalDays, limit);
    if (!path) return '';
    const pts = vals.slice(0, limit || vals.length);
    const lastX = toX(pts.length, totalDays).toFixed(1);
    const baseY = (PAD.top + chartH).toFixed(1);
    return `${path} L${lastX},${baseY} L${toX(1, totalDays).toFixed(1)},${baseY} Z`;
  };

  const curPath = makePath(data.current, data.daysInCur, data.todayDay);
  const lastPath = makePath(data.last, data.daysInLast);
  const curArea = makeArea(data.current, data.daysInCur, data.todayDay);
  const lastArea = makeArea(data.last, data.daysInLast);

  const todayX = data.current.length >= data.todayDay ? toX(data.todayDay, data.daysInCur) : null;
  const todayY = data.current.length >= data.todayDay ? toY(data.current[data.todayDay - 1]) : null;

  // Y axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({ val: maxVal * p, y: toY(maxVal * p) }));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8D4C0" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#B8D4C0" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="lastGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0C0CE" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#E0C0CE" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yTicks.map(({ val, y }) => (
        <g key={val}>
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f0f0f0" strokeWidth="0.5"/>
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#bbb">
            {val === 0 ? '$0' : val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${Math.round(val)}`}
          </text>
        </g>
      ))}

      {/* Last month area + line */}
      {lastArea && <path d={lastArea} fill="url(#lastGrad)"/>}
      {lastPath && <path d={lastPath} fill="none" stroke="#E0C0CE" strokeWidth="1.5" strokeLinejoin="round"/>}

      {/* Current month area + line */}
      {curArea && <path d={curArea} fill="url(#curGrad)"/>}
      {curPath && <path d={curPath} fill="none" stroke="#B8D4C0" strokeWidth="2" strokeLinejoin="round"/>}

      {/* Today dot */}
      {todayX !== null && todayY !== null && (
        <>
          <circle cx={todayX} cy={todayY} r="4" fill="#B8D4C0"/>
          <circle cx={todayX} cy={todayY} r="7" fill="none" stroke="#B8D4C0" strokeWidth="1" opacity="0.3"/>
        </>
      )}

      {/* X axis day labels */}
      {[1, 8, 15, 22, data.daysInCur].map(d => (
        <text key={d} x={toX(d, data.daysInCur)} y={H - 4} textAnchor="middle" fontSize="9" fill="#bbb">{d}</text>
      ))}
    </svg>
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgetSubtab, setBudgetSubtab] = useState<'maddie' | 'joint'>('maddie');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('All');
  const [filterMonth, setFilterMonth] = useState('All');
  const [showArchive, setShowArchive] = useState(false);
  const [txnSort, setTxnSort] = useState<'date' | 'amount' | 'merchant'>('date');
  const [archiveSort, setArchiveSort] = useState<'date' | 'txn_date' | 'amount' | 'merchant'>('date');
  const [uploadModal, setUploadModal] = useState<{ file: File; source: string } | null>(null);
  const [uploadAccount, setUploadAccount] = useState('');
  const [plaidConnecting, setPlaidConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const connectBank = async () => {
    setPlaidConnecting(true);
    try {
      const { hosted_link_url } = await fetch('/api/create-link-token', { method: 'POST' }).then(r => r.json());
      if (hosted_link_url) {
        // Post to native iOS to open ASWebAuthenticationSession
        (window as any).webkit?.messageHandlers?.plaidLink?.postMessage(hosted_link_url);
        // Fallback for web browser
        if (!(window as any).webkit?.messageHandlers?.plaidLink) {
          window.open(hosted_link_url, '_blank');
        }
      }
    } catch (e) { console.error(e); }
    setPlaidConnecting(false);
  };

  const refreshTransactions = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/transactions');
      await Promise.all([fetchFromSupabase(), fetchArchived()]);
    } catch (e) { console.error(e); }
    setRefreshing(false);
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
    const sorted = [...filteredTxns].sort((a, b) => {
      if (txnSort === 'amount') return b.amount - a.amount;
      if (txnSort === 'merchant') return a.merchant.localeCompare(b.merchant);
      return b.date.localeCompare(a.date);
    });
    const map: Record<string, Txn[]> = {};
    sorted.forEach(t => { const m = t.date.slice(0, 7); if (!map[m]) map[m] = []; map[m].push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTxns, txnSort]);

  const filteredArchive = useMemo(() => {
    const base = archiveSearch.trim() ? archivedTxns.filter(t => t.merchant.toLowerCase().includes(archiveSearch.toLowerCase())) : archivedTxns;
    return [...base].sort((a, b) => {
      if (archiveSort === 'amount') return b.amount - a.amount;
      if (archiveSort === 'merchant') return a.merchant.localeCompare(b.merchant);
      if (archiveSort === 'txn_date') return b.date.localeCompare(a.date);
      return 0; // 'date' = keep archived_at order from server
    });
  }, [archivedTxns, archiveSearch, archiveSort]);

  // Chart: cumulative daily spending for selected month vs previous month
  const chartData = useMemo(() => {
    const now = new Date();
    const curMonthStr = now.toISOString().slice(0, 7);
    const activeMonth = selectedMonth || curMonthStr;
    const [ay, am] = activeMonth.split('-').map(Number);
    const prevDate = new Date(ay, am - 2, 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const isCurrentMonth = activeMonth === curMonthStr;
    const todayDay = isCurrentMonth ? now.getDate() : new Date(ay, am, 0).getDate();
    const daysInCur = new Date(ay, am, 0).getDate();
    const daysInPrev = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate();

    const curTxns = allTxns.filter(t => t.date.startsWith(activeMonth));
    const prevTxns = allTxns.filter(t => t.date.startsWith(prevMonth));

    const buildCumulative = (txns: Txn[], days: number) => {
      const daily: number[] = Array(days + 1).fill(0);
      txns.forEach(t => { const day = parseInt(t.date.slice(8, 10)); daily[day] += myShare(t); });
      const cumulative: number[] = [];
      let sum = 0;
      for (let d = 1; d <= days; d++) { sum += daily[d]; cumulative.push(sum); }
      return cumulative;
    };

    return {
      current: buildCumulative(curTxns, daysInCur),
      last: buildCumulative(prevTxns, daysInPrev),
      todayDay,
      daysInCur,
      daysInLast: daysInPrev,
      curMonth: activeMonth,
      lastMonth: prevMonth,
    };
  }, [allTxns, selectedMonth]);

  const maddieBills  = bills.filter(b => b.account === 'maddie');
  const maddieIncome = income.filter(p => p.account === 'maddie');
  const jointBills   = bills.filter(b => b.account === 'joint');
  const jointIncome  = income.filter(p => p.account === 'joint');

  const TAB_H = 52;

  return (
    <>
      <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js" async />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: theme.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', paddingBottom: 16 }}>

          {tab === 'transactions' && (
            <div style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
              <div style={{ padding: '0 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>Transactions</div>
                    {txns.filter(t => !t.label).length > 0 && (
                      <div style={{ fontSize: 12, color: theme.secondaryLight, marginTop: 2 }}>
                        {txns.filter(t => !t.label).length} to review
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={connectBank} disabled={plaidConnecting} style={{ padding: '7px 10px', borderRadius: 20, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: plaidConnecting ? theme.textFaint : theme.accent, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Connect bank">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/>
                      </svg>
                    </button>
                    <button onClick={refreshTransactions} disabled={refreshing} style={{ padding: '7px 10px', borderRadius: 20, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: refreshing ? theme.textFaint : theme.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Refresh transactions">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                      </svg>
                    </button>
                    <button onClick={() => setShowArchive(true)} style={{ padding: '7px 10px', borderRadius: 20, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: theme.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8"/><line x1="10" y1="13" x2="14" y2="13"/>
                      </svg>
                    </button>
                    <label style={{ padding: '7px 10px', borderRadius: 20, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: theme.textMid, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
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
                  <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 8, background: theme.bgSubtle, minWidth: 0 }}>
                    <option value="All">All accounts</option>
                    {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 8, background: theme.bgSubtle, minWidth: 0 }}>
                    <option value="All">All months</option>
                    {Array.from(new Set(txns.map(t => t.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a)).map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                  <select value={txnSort} onChange={e => setTxnSort(e.target.value as any)} style={{ flex: 1, fontSize: 12, padding: '7px 10px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 8, background: theme.bgSubtle, minWidth: 0 }}>
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                    <option value="merchant">Merchant</option>
                  </select>
                </div>
              </div>
              {loading && <div style={{ textAlign: 'center', padding: '40px', color: theme.textFaint, fontSize: 13 }}>Loading…</div>}
              {!loading && txns.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: theme.textFaint }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#B8D4C0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
                  </svg>
                  <div style={{ fontSize: 16, fontWeight: 600, color: theme.textMid }}>All sorted out!</div>
                </div>
              )}
              {!loading && txnsByMonth.map(([month, mTxns]) => (
                <div key={month} style={{ marginBottom: 8 }}>
                  <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textMid }}>{monthLabel(month)}</div>
                    <span style={{ fontSize: 12, color: theme.textFaint }}>{fmt(mTxns.reduce((s, t) => s + myShare(t), 0))}</span>
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
              <div style={{ padding: '0 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 20 }}>Budget</div>
                <div style={{ display: 'flex', background: theme.bgSubtle, borderRadius: 10, padding: 3 }}>
                  {(['maddie', 'joint'] as const).map(sub => (
                    <button key={sub} onClick={() => setBudgetSubtab(sub)} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                      background: budgetSubtab === sub ? theme.bg : 'transparent',
                      color: budgetSubtab === sub ? theme.text : theme.textSubtle,
                      fontWeight: budgetSubtab === sub ? 600 : 400,
                      boxShadow: budgetSubtab === sub ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}>{sub === 'maddie' ? 'Maddie' : 'Joint'}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '0 20px' }}>
                {budgetSubtab === 'maddie' && <BudgetAccount title="Maddie — personal" bills={maddieBills} income={maddieIncome} txns={allTxns} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('maddie')} onAddIncome={handleAddIncome('maddie')} />}
                {budgetSubtab === 'joint' && <BudgetAccount title="Joint account" bills={jointBills} income={jointIncome} onTogglePaid={handleTogglePaid} onUpdateAmount={handleUpdateAmount} onDeleteBill={handleDeleteBill} onDeleteIncome={handleDeleteIncome} onAddBill={handleAddBill('joint')} onAddIncome={handleAddIncome('joint')} />}
              </div>
            </div>
          )}

          {tab === 'summary' && (
            <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))', overflowX: 'hidden' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 20 }}>Summary</div>

              {/* 1. YTD Income + Spending */}
              <div style={{ fontSize: 10, color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Year to Date</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: theme.accent, marginBottom: 4 }}>Income</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: theme.accent }}>{fmt(ytdStats.income)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: theme.textFaint, marginBottom: 4 }}>Spending</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{fmt(ytdStats.total)}</div>
                </div>
              </div>

              {/* 2. YTD Pie chart */}
              <PieChart needs={ytdStats.needs} wants={ytdStats.wants} impulse={ytdStats.impulse} />

              {/* 3 + 4. Monthly breakdown + chart */}
              <div style={{ borderTop: `0.5px solid ${theme.divider}`, paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Monthly</div>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 8, background: theme.bg, color: theme.text }}>
                    {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: theme.accent, marginBottom: 4 }}>Income</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: theme.accent }}>{fmt(monthlyStats.income)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: theme.textFaint, marginBottom: 4 }}>Spending</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{fmt(monthlyStats.total)}</div>
                  </div>
                </div>
                <SpendingChart data={chartData} />
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: theme.accentLight, borderRadius: 1 }}/>
                    <span style={{ fontSize: 10, color: theme.textFaint }}>{monthLabel(chartData.curMonth)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: theme.secondaryLight, borderRadius: 1 }}/>
                    <span style={{ fontSize: 10, color: theme.textFaint }}>{monthLabel(chartData.lastMonth)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showArchive && (
            <div style={{ position: 'fixed', inset: 0, background: theme.bg, zIndex: 150, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0 20px', paddingTop: 'max(20px, env(safe-area-inset-top))', marginBottom: 12, borderBottom: `0.5px solid ${theme.divider}`, paddingBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>Archive</div>
                  <button onClick={() => setShowArchive(false)} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 20, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: theme.textMid, cursor: 'pointer' }}>Done</button>
                </div>
                <input placeholder="Search transactions..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                  style={{ width: '100%', fontSize: 14, padding: '10px 14px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 10, background: theme.bgSubtle, boxSizing: 'border-box' as const, marginBottom: 8 }} />
                <select value={archiveSort} onChange={e => setArchiveSort(e.target.value as any)} style={{ width: '100%', fontSize: 12, padding: '7px 10px', border: `0.5px solid ${theme.borderMid}`, borderRadius: 8, background: theme.bgSubtle, boxSizing: 'border-box' as const }}>
                  <option value="date">Sort by recent</option>
                  <option value="amount">Sort by amount</option>
                  <option value="merchant">Sort by merchant</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', paddingBottom: 40 }}>
                {filteredArchive.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: theme.textFaint, fontSize: 13 }}>No archived transactions.</div>}
                {filteredArchive.map(t => <ArchiveCard key={t.id} t={t} onRecover={t => { recoverTxn(t); }} />)}
              </div>
            </div>
          )}

        </div>

        {uploadModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: theme.bg, width: '100%', borderRadius: '16px 16px 0 0', padding: '24px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Upload {uploadModal.source === 'amex' ? 'Amex' : 'Chase'} CSV</div>
              <div style={{ fontSize: 13, color: theme.textFaint, marginBottom: 20 }}>Select account to import into</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {manualAccountsDb.map(a => (
                  <button key={a.id} onClick={() => setUploadAccount(a.name)} style={{
                    padding: '12px 16px', borderRadius: 10, textAlign: 'left', fontSize: 14, cursor: 'pointer',
                    border: uploadAccount === a.name ? `1.5px solid ${theme.text}` : `0.5px solid ${theme.borderMid}`,
                    background: uploadAccount === a.name ? theme.accentBg : theme.bg,
                    fontWeight: uploadAccount === a.name ? 600 : 400,
                  }}>{a.name}</button>
                ))}
                <button onClick={() => { const n = prompt('New account name?'); if (n) setUploadAccount(n); }} style={{
                  padding: '12px 16px', borderRadius: 10, textAlign: 'left', fontSize: 14, color: theme.textFaint, cursor: 'pointer',
                  border: uploadAccount && !manualAccountsDb.find(a => a.name === uploadAccount) ? `1.5px solid ${theme.text}` : `0.5px dashed ${theme.borderMid}`,
                  background: theme.bg,
                }}>+ New account{uploadAccount && !manualAccountsDb.find(a => a.name === uploadAccount) ? `: ${uploadAccount}` : ''}</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setUploadModal(null)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, fontSize: 15, cursor: 'pointer' }}>Cancel</button>
                <button disabled={!uploadAccount} onClick={async () => {
                  const csv = await uploadModal.file.text();
                  const r = await fetch('/api/transactions/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, source: uploadModal.source, accountName: uploadAccount }) }).then(r => r.json());
                  setUploadModal(null);
                  alert('Inserted: ' + r.inserted + ', Skipped: ' + r.skipped);
                  fetchFromSupabase(); fetchArchived(); fetchManualAccounts();
                }} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: uploadAccount ? theme.secondary : theme.borderMid, color: 'white', fontSize: 15, fontWeight: 600, cursor: uploadAccount ? 'pointer' : 'default' }}>
                  Import{uploadAccount ? ' to ' + uploadAccount : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{
          background: theme.bg,
          borderTop: `0.5px solid ${theme.divider}`,
          display: 'flex', justifyContent: 'space-evenly', alignItems: 'center',
          flexShrink: 0, height: TAB_H,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? theme.tabActive : theme.tabInactive, padding: '8px 12px',
            }}>
              <Icon />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}