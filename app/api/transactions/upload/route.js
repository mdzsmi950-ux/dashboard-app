import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { row.push(field.trim()); field = ''; }
    else if ((c === '\n' || c === '\r') && !inQuote) {
      if (field.trim() || row.length) { row.push(field.trim()); rows.push(row); }
      row = []; field = '';
      if (c === '\r' && text[i+1] === '\n') i++;
    } else { field += c; }
  }
  if (field.trim() || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function parseChase(text, accountName) {
  const rows = parseCSV(text).slice(1);
  return rows.map(cols => {
    const date = cols[0]; const description = cols[2]; const amount = cols[5];
    if (!date || !description || amount === undefined) return null;
    const [m, d, y] = date.split('/');
    return {
      date: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,
      merchant: description,
      amount: parseFloat(amount) * -1,
      account: accountName,
    };
  }).filter(Boolean);
}

function parseAmex(text, accountName) {
  const rows = parseCSV(text).slice(1);
  return rows.map(cols => {
    const date = cols[0]; const description = cols[1]; const amount = cols[4];
    if (!date || !description || amount === undefined) return null;
    const [m, d, y] = date.split('/');
    return {
      date: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,
      merchant: description,
      amount: parseFloat(amount),
      account: accountName,
    };
  }).filter(Boolean);
}

export async function POST(req) {
  const { csv, source, accountName } = await req.json();
  const name = accountName || (source === 'amex' ? 'Amex' : 'Chase');
  const txns = source === 'amex' ? parseAmex(csv, name) : parseChase(csv, name);
  let inserted = 0, skipped = 0;

  for (const t of txns) {
    if (!t.date || isNaN(t.amount)) { skipped++; continue; }
    const isInternalTransfer = /^(To|From) (Checking|Savings)/i.test(t.merchant);

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('date', t.date)
      .eq('merchant', t.merchant)
      .eq('amount', t.amount)
      .eq('account', t.account)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    const id = `${t.account}-${t.date}-${t.merchant}-${t.amount}`
      .replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().slice(0, 80);

    await supabase.from('transactions').insert({
      id,
      date: t.date,
      merchant: t.merchant,
      amount: t.amount,
      account: t.account,
      label: isInternalTransfer ? 'Ignore' : null,
      category: null,
      notes: '',
      archived: isInternalTransfer,
    });
    inserted++;
  }

  // Auto-create manual account entry if it doesn't exist
  const { data: existingAccount } = await supabase
    .from('manual_accounts')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (!existingAccount) {
    await supabase.from('manual_accounts').insert({
      name,
      balance: 0,
      balance_date: new Date().toISOString().split('T')[0],
    });
  }

  return NextResponse.json({ inserted, skipped });
}