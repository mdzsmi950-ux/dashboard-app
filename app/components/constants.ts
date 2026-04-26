import type { Label, Category, Txn } from './types';

// Headspace-inspired palette
// Cream: #FAF7F2  Coral: #E8654A  Teal: #4ABFBF  Purple: #7B6EA6  Warm gray: #8C8279

export const labelColors: Record<Label, { bg: string; border: string; color: string }> = {
  Mine:   { bg: '#E8F6F6', border: '#4ABFBF', color: '#2A8A8A' },
  Joint:  { bg: '#FCEEE9', border: '#E8654A', color: '#C04830' },
  Ignore: { bg: '#F5F2EE', border: '#D4C9BC', color: '#9C8E82' },
};

export const catColors: Record<Category, { bg: string; border: string; color: string }> = {
  Needs:   { bg: '#E8F6F6', border: '#4ABFBF', color: '#2A8A8A' },
  Wants:   { bg: '#F0EDF8', border: '#A99ACC', color: '#5E4E8A' },
  Impulse: { bg: '#FCEEE9', border: '#E8654A', color: '#C04830' },
  Income:  { bg: '#EEF7EE', border: '#7DBF7D', color: '#3A7A3A' },
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

export const inp = { padding: '6px 10px', borderRadius: 8, border: '0.5px solid #D4C9BC', background: 'white', color: '#3A3530', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
export const addBtn = { padding: '6px 12px', borderRadius: 8, border: '0.5px solid #D4C9BC', background: '#F5F2EE', color: '#3A3530', fontSize: 13, cursor: 'pointer' };
export const delBtn = { padding: '2px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: '#E8654A', fontSize: 12, cursor: 'pointer' };