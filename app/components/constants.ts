import type { Label, Category, Txn } from './types';

// Light, airy palette on warm beige
// Very desaturated, soft tints — nothing deep or saturated
// Black for text when needed

export const labelColors: Record<Label, { bg: string; border: string; color: string }> = {
  Mine:   { bg: '#E2EFE8', border: '#B8D4C0', color: '#3A6B4A' },
  Joint:  { bg: '#F5E6ED', border: '#E0C0CE', color: '#8B4060' },
  Ignore: { bg: '#EDEBE6', border: '#CFC9BC', color: '#8C8279' },
};

export const catColors: Record<Category, { bg: string; border: string; color: string }> = {
  Needs:   { bg: '#E2EFE8', border: '#B8D4C0', color: '#3A6B4A' },
  Wants:   { bg: '#E8EEF5', border: '#C0CCE0', color: '#3A5080' },
  Impulse: { bg: '#F5E6ED', border: '#E0C0CE', color: '#8B4060' },
  Income:  { bg: '#E2EFE8', border: '#B8D4C0', color: '#3A6B4A' },
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

export const inp = { padding: '6px 10px', borderRadius: 8, border: '0.5px solid #CFC9BC', background: '#FDFAF6', color: '#1a1a1a', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
export const addBtn = { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #CFC9BC', background: '#EDEBE6', color: '#1a1a1a', fontSize: 13, cursor: 'pointer' };
export const delBtn = { padding: '2px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#8B4060', fontSize: 12, cursor: 'pointer' };