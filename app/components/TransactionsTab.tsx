'use client';
import { useState } from 'react';
import TxnRow from './TxnRow';
import type { Txn, ManualAccount } from './types';
import { fmt, monthLabel, today, inp, addBtn, delBtn } from './constants';

type Props = {
  txns: Txn[];
  loading: boolean;
  manualAccountsDb: ManualAccount[];
  updateField: (id: string, field: string, val: any) => void;
  archiveMonth: (month: string, type: 'label' | 'category') => void;
  addManualTxn: (txn: { date: string; merchant: string; amount: string; account: string }) => void;
  addManualAccount: (name: string) => void;
};

const myShare = (t: Txn) => {
  if (!t.label || t.label === 'Ignore' || t.category === 'Income') return 0;
  return t.label === 'Joint' ? t.amount / 2 : t.label === 'Mine' ? t.amount : 0;
};

const monthStats = (mTxns: Txn[]) => ({
  total: mTxns.reduce((s, t) => s + myShare(t), 0),
  joint: mTxns.filter(t => t.label === 'Joint').reduce((s, t) => s + t.amount, 0),
});

const isFullyLabeled = (mTxns: Txn[]) => mTxns.every(t => t.label !== null);

export default function TransactionsTab({ txns, loading, manualAccountsDb, updateField, archiveMonth, addManualTxn, addManualAccount }: Props) {
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [newTxn, setNewTxn] = useState({ date: today, merchant: '', amount: '', account: '' });
  const [newAccountName, setNewAccountName] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  const accountOptions = Array.from(new Set(txns.map(t => t.account).filter(Boolean))).sort() as string[];

  const filtered = txns.filter(t => {
    const matchSearch = t.merchant.toLowerCase().includes(search.toLowerCase());
    const matchLabel = filterLabel === 'All' || t.label === filterLabel || (filterLabel === 'Unlabeled' && !t.label);
    const matchAccount = filterAccount === 'All' || t.account === filterAccount;
    return matchSearch && matchLabel && matchAccount;
  });

  const txnsByMonth: [string, Txn[]][] = (() => {
    const map: Record<string, Txn[]> = {};
    filtered.forEach(t => { const m = t.date.slice(0, 7); if (!map[m]) map[m] = []; map[m].push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const handleAdd = () => {
    addManualTxn(newTxn);
    setNewTxn({ date: today, merchant: '', amount: '', account: newTxn.account });
  };

  return (
    <>
      <div style={{ border: '0.5px solid #eee', borderRadius: 12, padding: '12px', marginBottom: '1rem', background: '#fafafa' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Add transaction</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <input type="date" value={newTxn.date} onChange={e => setNewTxn(p => ({ ...p, date: e.target.value }))} style={{ ...inp }} />
          <input type="number" placeholder="Amount" value={newTxn.amount} onChange={e => setNewTxn(p => ({ ...p, amount: e.target.value }))} style={{ ...inp }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
          <input placeholder="Description" value={newTxn.merchant} onChange={e => setNewTxn(p => ({ ...p, merchant: e.target.value }))} style={{ ...inp }} />
          {!addingAccount
            ? <select value={newTxn.account} onChange={e => { if (e.target.value === '__new') setAddingAccount(true); else setNewTxn(p => ({ ...p, account: e.target.value })); }} style={{ ...inp }}>
                <option value="">No account</option>
                {manualAccountsDb.map(ma => <option key={ma.id} value={ma.name}>{ma.name}</option>)}
                <option value="__new">+ New account</option>
              </select>
            : <div style={{ display: 'flex', gap: 4 }}>
                <input autoFocus placeholder="Account name" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { addManualAccount(newAccountName); setAddingAccount(false); setNewAccountName(''); }}} style={{ ...inp, flex: 1 }} />
                <button onClick={() => { addManualAccount(newAccountName); setAddingAccount(false); setNewAccountName(''); }} style={addBtn}>Add</button>
                <button onClick={() => { setAddingAccount(false); setNewAccountName(''); }} style={delBtn}>✕</button>
              </div>}
        </div>
        <button onClick={handleAdd} style={{ ...addBtn, background: '#3A5068', color: 'white', border: 'none', width: '100%' }}>+ Add Transaction</button>
      </div>

      {loading && <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>Loading...</p>}
      {!loading && txns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No transactions yet</p>
          <p style={{ fontSize: 13 }}>Click "Connect" to link your account via Plaid</p>
        </div>
      )}
      {!loading && txns.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, fontSize: 13, padding: '6px 10px', border: '0.5px solid #ddd', borderRadius: 8 }} />
            <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} style={{ fontSize: 12, padding: '6px 8px', border: '0.5px solid #ddd', borderRadius: 8 }}>
              <option>All</option><option>Maddie</option><option>Nick</option><option>Joint</option><option>Ignore</option><option>Unlabeled</option>
            </select>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ fontSize: 12, padding: '6px 8px', border: '0.5px solid #ddd', borderRadius: 8 }}>
              <option value="All">All accounts</option>
              {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {txnsByMonth.map(([month, mTxns]) => {
            const ms = monthStats(mTxns);
            return (
              <div key={month} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{monthLabel(month)}</span>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>{fmt(ms.total)}</span>
                  </div>
                  {isFullyLabeled(mTxns) && (
                    <button onClick={() => archiveMonth(month, 'label')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: '0.5px solid #B0C0D0', background: '#E8EEF4', color: '#3A5068', cursor: 'pointer' }}>Confirm</button>
                  )}
                </div>
                <div style={{ border: '0.5px solid #eee', borderRadius: 12, overflow: 'hidden', overflowAnchor: 'none' as const }}>
                  {mTxns.map((t, i) => <TxnRow key={t.id} t={t} i={i} updateField={updateField} />)}
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}