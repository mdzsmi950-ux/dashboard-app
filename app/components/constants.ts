import type { Label, Category, Txn } from './types';

// ─── Central color palette ────────────────────────────────────────────────────
// Change colors here only — everything imports from theme

export const theme = {
  // Backgrounds
  bg:           '#ffffff',
  bgSubtle:     '#f5f5f5',

  // Text
  text:         '#1a1a1a',
  textMid:      '#555555',
  textSubtle:   '#888888',
  textFaint:    '#aaaaaa',
  textDisabled: '#cccccc',

  // Borders & dividers
  border:       '#e8e8e8',
  borderMid:    '#e0e0e0',
  divider:      '#f0f0f0',

  // Accent — sage green (Mine, Needs, Income, positive amounts)
  accent:       '#3A6B4A',
  accentLight:  '#B8D4C0',
  accentBg:     '#E2EFE8',

  // Secondary — dusty rose (Joint, Impulse, archive recover)
  secondary:    '#8B4060',
  secondaryLight:'#E0C0CE',
  secondaryBg:  '#F5E6ED',

  // Wants — slate blue
  wants:        '#3A5080',
  wantsBg:      '#E8EEF5',
  wantsLight:   '#C0CCE0',

  // UI states
  tabActive:    '#1a1a1a',
  tabInactive:  '#cccccc',
  pillBorder:   '#e8e8e8',

  // Upload modal
  uploadActive: '#1a1a1a',
  uploadInactive:'#cccccc',
};

// ─── Label colors ─────────────────────────────────────────────────────────────
export const labelColors: Record<Label, { bg: string; border: string; color: string }> = {
  Mine:   { bg: theme.accentBg,    border: theme.accentLight,    color: theme.accent    },
  Joint:  { bg: theme.secondaryBg, border: theme.secondaryLight, color: theme.secondary },
  Ignore: { bg: theme.bgSubtle,    border: theme.borderMid,      color: theme.textFaint },
};

// ─── Category colors ──────────────────────────────────────────────────────────
export const catColors: Record<Category, { bg: string; border: string; color: string }> = {
  Needs:   { bg: theme.accentBg,    border: theme.accentLight,    color: theme.accent    },
  Wants:   { bg: theme.wantsBg,     border: theme.wantsLight,     color: theme.wants     },
  Impulse: { bg: theme.secondaryBg, border: theme.secondaryLight, color: theme.secondary },
  Income:  { bg: theme.accentBg,    border: theme.accentLight,    color: theme.accent    },
};

// ─── Utility styles ───────────────────────────────────────────────────────────
export const inp = { padding: '6px 10px', borderRadius: 8, border: `0.5px solid ${theme.borderMid}`, background: theme.bg, color: theme.text, fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
export const addBtn = { padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${theme.borderMid}`, background: theme.bgSubtle, color: theme.text, fontSize: 13, cursor: 'pointer' };
export const delBtn = { padding: '2px 8px', borderRadius: 8, border: 'none', background: 'transparent', color: theme.secondary, fontSize: 12, cursor: 'pointer' };

// ─── Formatters ───────────────────────────────────────────────────────────────
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