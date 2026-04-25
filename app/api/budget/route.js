import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const today = new Date().toISOString().split('T')[0];

const toDateStr = (y, m, d) => {
  const day = Math.min(d, new Date(y, m + 1, 0).getDate());
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const lastDayOf = (y, m) => {
  const d = new Date(y, m + 1, 0);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getCutoff = () => {
  const d = new Date(today);
  const nm = d.getMonth() + 2;
  const y = nm > 11 ? d.getFullYear() + 1 : d.getFullYear();
  const m = nm > 11 ? 0 : nm;
  return new Date(y, m, 0).toISOString().split('T')[0];
};
const biweekly = (seed, cutoff) => {
  const dates = [];
  let d = new Date(seed);
  while (d.toISOString().split('T')[0] <= cutoff) {
    dates.push(d.toISOString().split('T')[0]);
    d = new Date(d); d.setDate(d.getDate() + 14);
  }
  return dates;
};

const MADDIE_BILLS = [
  { name: 'Honda',  day: 23, autopay: true,  amount: '616.81', endDate: '2029-05' },
  { name: 'Mohela', day: 28, autopay: true,  amount: '1344.62', endDate: '2031-03' },
  { name: 'Lasik',  day: 17, autopay: false, amount: '125',    endDate: '2027-03' },
  { name: 'Apple',  day: 'last', autopay: false, amount: '0' },
];

const JOINT_BILLS = [
  { name: 'Robinhood',  day: 5,  amount: '0', isCard: true },
  { name: 'CSP',        day: 10, amount: '0', isCard: true },
  { name: 'Amex Blue',  day: 11, amount: '0', isCard: true },
  { name: 'Amex Gold',  day: 11, amount: '0', isCard: true },
  { name: 'Costco',     day: 17, amount: '0', isCard: true },
  { name: 'WholeFoods', day: 25, amount: '0', isCard: true },
];

function generateBills(cutoff) {
  const now = new Date(today);
  let y = now.getFullYear(), m = now.getMonth();
  const [ey, em] = cutoff.split('-').map(Number);
  let id = 1000;
  const maddieBills = [];
  const nickBills = [];

  while (new Date(y, m, 1) <= new Date(ey, em - 1, 1)) {
    const mo = String(m + 1).padStart(2, '0');
    const ym = `${y}-${mo}`;

    for (const r of MADDIE_BILLS) {
      if (r.endDate && ym > r.endDate) continue;
      const due = r.day === 'last' ? lastDayOf(y, m) : toDateStr(y, m, r.day);
      if (due <= cutoff) {
        maddieBills.push({
          id: id++, account: 'maddie', name: r.name,
          due, paid: false, autopay: !!r.autopay,
          amount: r.amount || '0', is_card: false,
          statement_locked: false,
        });
      }
    }

    // BOA May 2026 only
    if (y === 2026 && m === 4) {
      maddieBills.push({ id: id++, account: 'maddie', name: 'BOA', amount: '81', due: '2026-05-15', paid: false, autopay: false, is_card: false, statement_locked: false });
    }

    for (const r of JOINT_BILLS) {
      const due = toDateStr(y, m, r.day);
      if (due <= cutoff) {
        nickBills.push({
          id: id++, account: 'joint', name: r.name,
          due, paid: false, autopay: false,
          amount: '0', is_card: true,
          statement_locked: false,
        });
      }
    }

    if (++m > 11) { m = 0; y++; }
  }

  // Paycheck-linked transfers
  const paycheckDates = biweekly('2026-04-29', cutoff);
  paycheckDates.forEach((d, i) => {
    maddieBills.push({ id: id++, account: 'maddie', name: 'Transfer to joint', amount: i === 0 ? '1480' : '1000', due: d, paid: false, autopay: false, is_card: false, statement_locked: false });
    maddieBills.push({ id: id++, account: 'maddie', name: 'Savings', amount: '300', due: d, paid: false, autopay: false, is_card: false, statement_locked: false });
  });

  return { maddieBills, nickBills };
}

function generateIncome(cutoff) {
  const paycheckDates = biweekly('2026-04-29', cutoff);
  const nickDates = biweekly('2026-04-23', cutoff);
  let id = 2000;

  const maddieIncome = [
    { id: id++, account: 'maddie', date: today, amount: '0', label: 'Current balance' },
    ...paycheckDates.map(d => ({ id: id++, account: 'maddie', date: d, amount: '2900', label: 'Paycheck' })),
  ];

  const jointIncome = [
    { id: id++, account: 'joint', date: today, amount: '0', label: 'Current balance' },
    ...nickDates.map(d => ({ id: id++, account: 'joint', date: d, amount: '1000', label: 'Nick contribution' })),
    ...paycheckDates.map((d, i) => ({ id: id++, account: 'joint', date: d, amount: i === 0 ? '1480' : '1000', label: 'Maddie transfer' })),
  ];

  return { maddieIncome, jointIncome };
}

export async function GET() {
  const [{ data: bills }, { data: income }] = await Promise.all([
    supabase.from('budget_bills').select('*').order('due'),
    supabase.from('budget_income').select('*').order('date'),
  ]);

  // Auto-generate if empty
  if (!bills || bills.length === 0) {
    const cutoff = getCutoff();
    const { maddieBills, nickBills } = generateBills(cutoff);
    const { maddieIncome, jointIncome } = generateIncome(cutoff);
    const allBills = [...maddieBills, ...nickBills];
    const allIncome = [...maddieIncome, ...jointIncome];
    await supabase.from('budget_bills').insert(allBills);
    await supabase.from('budget_income').insert(allIncome);
    return NextResponse.json({ bills: allBills, income: allIncome });
  }

  return NextResponse.json({ bills: bills || [], income: income || [] });
}

export async function POST(req) {
  const { action, table, data } = await req.json();

  if (action === 'upsert') {
    await supabase.from(table).upsert(data);
  } else if (action === 'delete') {
    await supabase.from(table).delete().eq('id', data.id);
  } else if (action === 'update') {
    await supabase.from(table).update(data.fields).eq('id', data.id);
  }

  return NextResponse.json({ success: true });
}