'use client';
import type { Txn, Label } from './types';
import { labelColors, fmt } from './constants';

export default function TxnRow({ t, i, updateField }: { t: Txn; i: number; updateField: (id: string, field: string, val: any) => void }) {
  return (
    <div style={{ padding: '10px 14px', fontSize: 13, borderTop: i === 0 ? 'none' : '0.5px solid #eee', overflowAnchor: 'none' as const }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0 }}>
          <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>{t.date.slice(5)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
        </div>
        <span style={{ fontWeight: 500, color: t.amount < 0 ? '#3A6850' : '#000', flexShrink: 0, marginLeft: 8 }}>
          {t.amount < 0 ? '+' : ''}{fmt(t.amount)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {(['Mine', 'Joint', 'Ignore'] as Label[]).map(l => (
          <button key={l} onClick={(e) => { e.preventDefault(); updateField(t.id, 'label', l); }} style={{ fontSize: 11, padding: '3px 7px', borderRadius: 20, cursor: 'pointer', border: `0.5px solid ${t.label === l ? labelColors[l].border : '#eee'}`, background: t.label === l ? labelColors[l].bg : 'transparent', color: t.label === l ? labelColors[l].color : '#ccc', fontWeight: t.label === l ? 500 : 400 }}>{l}</button>
        ))}
      </div>
    </div>
  );
}