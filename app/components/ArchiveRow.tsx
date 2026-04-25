'use client';
import type { Txn, Label, Category } from './types';
import { labelColors, catColors, fmt } from './constants';

export default function ArchiveRow({ t, i, updateField }: { t: Txn; i: number; updateField: (id: string, field: string, val: any) => void }) {
  return (
    <div style={{ padding: '10px 14px', fontSize: 13, borderTop: i === 0 ? 'none' : '0.5px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', minWidth: 0 }}>
          <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>{t.date.slice(5)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
          {t.label && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 20, background: labelColors[t.label].bg, color: labelColors[t.label].color, flexShrink: 0 }}>{t.label}</span>}
          {t.category && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 20, background: catColors[t.category].bg, color: catColors[t.category].color, flexShrink: 0 }}>{t.category}</span>}
        </div>
        <span style={{ fontWeight: 500, color: t.amount < 0 ? '#3A6850' : '#000', flexShrink: 0, marginLeft: 8 }}>
          {t.amount < 0 ? '+' : ''}{fmt(t.amount)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {(['Maddie', 'Nick', 'Joint', 'Ignore'] as Label[]).map(l => (
          <button key={l} onClick={(e) => { e.preventDefault(); updateField(t.id, 'label', l); }} style={{ fontSize: 11, padding: '3px 7px', borderRadius: 20, cursor: 'pointer', border: `0.5px solid ${t.label === l ? labelColors[l].border : '#eee'}`, background: t.label === l ? labelColors[l].bg : 'transparent', color: t.label === l ? labelColors[l].color : '#ccc', fontWeight: t.label === l ? 500 : 400 }}>{l}</button>
        ))}
        <span style={{ color: '#eee' }}>|</span>
        {(['Needs', 'Wants', 'Impulse', 'Income'] as Category[]).map(cat => {
          const disabled = t.label === 'Ignore' || !t.label;
          return <button key={cat} onClick={(e) => { e.preventDefault(); if (!disabled) updateField(t.id, 'category', cat); }} style={{ fontSize: 11, padding: '3px 7px', borderRadius: 20, cursor: disabled ? 'default' : 'pointer', border: `0.5px solid ${!disabled && t.category === cat ? catColors[cat].border : '#eee'}`, background: !disabled && t.category === cat ? catColors[cat].bg : 'transparent', color: !disabled && t.category === cat ? catColors[cat].color : '#ddd', fontWeight: !disabled && t.category === cat ? 500 : 400 }}>{cat}</button>;
        })}
      </div>
    </div>
  );
}