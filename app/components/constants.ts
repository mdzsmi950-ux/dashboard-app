import type { Label, Category, Txn } from './types';

export const labelColors: Record<Label, { bg: string; border: string; color: string }> = {
  Mine:   { bg: '#E8EEF4', border: '#B0C0D0', color: '#3A5068' },
  Joint:  { bg: '#E8F4EE', border: '#B0D0BC', color: '#3A6850' },
  Ignore: { bg: '#F5F5F5', border: '#DDD',    color: '#AAA'    },
};

export const catColors: Record<Category, { bg: string; border: string; color: string }> = {
  Needs:   { bg: '#F4EEE8', border: '#D0C0B0', color: '#685240' },
  Wants:   { bg: '#EEF4E8', border: '#BCD0B0', color: '#506840' },
  Impulse: { bg: '#F4E8EE', border: '#D0B0BC', color: '#683A52' },
  Income:  { bg: '#E8F4E8', border: '#A0D0A0', color: '#2A6030' },
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

export const inp = { padding: '6px 10px', borderRadius: 8, border: '0.5px solid #ddd', background: 'white', color: '#000', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
export const addBtn = { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #ddd', background: '#f5f5f5', color: '#000', fontSize: 13, cursor: 'pointer' };
export const delBtn = { padding: '2px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#b04040', fontSize: 12, cursor: 'pointer' };