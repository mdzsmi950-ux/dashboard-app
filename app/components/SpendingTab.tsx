'use client';
import SpendingRow from './SpendingRow';
import type { Txn } from './types';
import { fmt, monthLabel, myShare } from './constants';

type Props = {
  allTxns: Txn[];
  labelArchivedMonths: Set<string>;
  updateField: (id: string, field: string, val: any) => void;
  archiveMonth: (month: string, type: 'label' | 'category') => void;
};

const monthCatTotals = (mTxns: Txn[]) => {
  const map: Record<string, number> = {};
  mTxns.forEach(t => {
    if (!t.category) return;
    const share = !t.label || t.label === 'Ignore' || t.category === 'Income' ? 0 : t.label === 'Joint' ? t.amount / 2 : t.label === 'Maddie' ? t.amount : 0;
    map[t.category] = (map[t.category] || 0) + share;
  });
  return map;
};

const isFullyCategorized = (mTxns: Txn[]) => mTxns.every(t => t.category !== null || t.label === 'Ignore' || t.label === 'Nick');

export default function SpendingTab({ allTxns, labelArchivedMonths, updateField, archiveMonth }: Props) {
  const spendingByMonth: [string, Txn[]][] = (() => {
    const map: Record<string, Txn[]> = {};
    allTxns.filter(t => (t.label === 'Maddie' || t.label === 'Joint') && !t.category_archived)
      .forEach(t => { const m = t.date.slice(0, 7); if (!map[m]) map[m] = []; map[m].push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  if (allTxns.filter(t => t.label === 'Maddie' || t.label === 'Joint').length === 0) {
    return <div style={{ textAlign: 'center', padding: '3rem 0', color: '#888' }}><p style={{ fontSize: 13 }}>No labeled transactions yet.</p></div>;
  }

  return (
    <>
      {spendingByMonth.map(([month, mTxns]) => {
        const mCats = monthCatTotals(mTxns);
        return (
          <div key={month} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{monthLabel(month)}</span>
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>needs {fmt(mCats['Needs'] || 0)} · wants {fmt(mCats['Wants'] || 0)} · impulse {fmt(mCats['Impulse'] || 0)}</span>
              </div>
              {isFullyCategorized(mTxns) && labelArchivedMonths.has(month) && (
                <button onClick={() => archiveMonth(month, 'category')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, border: '0.5px solid #B0D0BC', background: '#E8F4EE', color: '#3A6850', cursor: 'pointer' }}>Confirm</button>
              )}
            </div>
            <div style={{ border: '0.5px solid #eee', borderRadius: 12, overflow: 'hidden', overflowAnchor: 'none' as const }}>
              {mTxns.map((t, i) => <SpendingRow key={t.id} t={t} i={i} updateField={updateField} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}