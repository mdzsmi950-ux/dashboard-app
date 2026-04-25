'use client';
import type { Txn, Category } from './types';
import { labelColors, catColors, fmt, myShare } from './constants';

export default function SpendingRow({ t, i, updateField }: { t: Txn; i: number; updateField: (id: string, field: string, val: any) => void }) {
  return (
    <div style={{ padding: '10px 14px', fontSize: 13, borderTop: i === 0 ? 'none' : '0.5px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0 }}>
          <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>{t.date.slice(5)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
          {t.label && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 20, background: labelColors[t.label].bg, color: labelColors[t.label].color, flexShrink: 0 }}>{t.label}</span>}
        </div>
        <span style={{ fontWeight: 500, color: t.amount < 0 ? '#3A6850' : '#000', flexShrink: 0, marginLeft: 8 }}>
          {t.amount < 0 ? '+' : ''}{fmt(myShare(t))}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
          const disabled = t.label === 'Ignore' || !t.label;
          return <button key={cat} onClick={(e) => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }} style={{ fontSize: 11, padding: '3px 7px', borderRadius: 20, cursor: disabled ? 'default' : 'pointer', border: `0.5px solid ${!disabled && t.category === cat ? catColors[cat].border : '#eee'}`, background: !disabled && t.category === cat ? catColors[cat].bg : 'transparent', color: !disabled && t.category === cat ? catColors[cat].color : '#ddd', fontWeight: !disabled && t.category === cat ? 500 : 400 }}>{cat}</button>;
        })}
      </div>
    </div>
  );
}