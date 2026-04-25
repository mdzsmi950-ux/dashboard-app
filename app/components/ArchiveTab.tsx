'use client';
import ArchiveRow from './ArchiveRow';
import type { Txn } from './types';
import { monthLabel } from './constants';

type Props = {
  archivedTxns: Txn[];
  updateField: (id: string, field: string, val: any) => void;
};

export default function ArchiveTab({ archivedTxns, updateField }: Props) {
  if (archivedTxns.length === 0) {
    return <p style={{ fontSize: 13, color: '#888' }}>No archived transactions yet.</p>;
  }

  const byMonth: Record<string, Txn[]> = {};
  archivedTxns.forEach(t => { const m = t.date.slice(0, 7); if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(t); });

  return (
    <>
      {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, mTxns]) => (
        <div key={month} style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#555', display: 'block', marginBottom: 8 }}>{monthLabel(month)}</span>
          <div style={{ border: '0.5px solid #eee', borderRadius: 12, overflow: 'hidden', overflowAnchor: 'none' as const }}>
            {mTxns.map((t, i) => <ArchiveRow key={t.id} t={t} i={i} updateField={updateField} />)}
          </div>
        </div>
      ))}
    </>
  );
}