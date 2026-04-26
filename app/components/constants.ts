import type { Label, Category, Txn } from './types';

// iOS Calendar palette: soft pink, soft green, warm beige bg
// Mine → soft green (like "Payday" events)
// Joint → soft pink (like birthday/reminder events)

export const labelColors: Record<Label, { bg: string; border: string; color: string }> = {
  Mine:   { bg: '#D4EDDA', border: '#7DC492', color: '#2E7D4F' },
  Joint:  { bg: '#FAD9E3', border: '#F0A0B8', color: '#B84068' },
  Ignore: { bg: '#EDE8E0', border: '#C8BFB0', color: '#9C8E82' },
};

export const catColors: Record<Category, { bg: string; border: string; color: string }> = {
  Needs:   { bg: '#D4EDDA', border: '#7DC492', color: '#2E7D4F' },
  Wants:   { bg: '#FAD9E3', border: '#F0A0B8', color: '#B84068' },
  Impulse: { bg: '#FFE8CC', border: '#F0B870', color: '#A0520A' },
  Income:  { bg: '#D4EDDA', border: '#7DC492', color: '#2E7D4F' },
};

export const fmt = (n: number) => "$" + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);
export const today = new Date().toISOString().split('T')[0];
export const labelDate = (d: string) => { if (!d) return ''; const [y, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}${parseInt(y) >= 2027 ? `/${y}` : ''}`; };
export const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString('default', { month: 'long', year: 'numeric' }); };

export const myShare = (t: Txn) => {
  if (!t.label || t.label === 'Ignore' || t.category === 'Income') return 0;
  return t.label === 'Joint' ? t.amount / 2 : t.label === 'Mine' ? t.amount : 0;
};

export const incomeShare = (t: Txn) => {
  if (t.category !== 'Income' || !t.label || t.label === 'Ignore') return 0;
  return t.label === 'Joint' ? Math.abs(t.amount) / 2 : t.label === 'Mine' ? Math.abs(t.amount) : 0;
};

export const inp = { padding: '6px 10px', borderRadius: 8, border: '0.5px solid #C8BFB0', background: 'white', color: '#3A3530', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
export const addBtn = { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #C8BFB0', background: '#EDE8E0', color: '#3A3530', fontSize: 13, cursor: 'pointer' };
export const delBtn = { padding: '2px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#B84068', fontSize: 12, cursor: 'pointer' };