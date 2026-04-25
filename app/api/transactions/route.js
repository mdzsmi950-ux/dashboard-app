import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const EXCLUDED_SUBTYPES = new Set(['student', 'ira', 'roth', 'brokerage', 'cash management', '401k', '403b', 'pension', 'retirement']);

async function fetchAllTransactions(accessToken, startDate, endDate) {
  const allTransactions = [];
  let accounts = [];
  const count = 500;
  let offset = 0;

  while (true) {
    const res = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count, offset },
    });

    if (offset === 0) accounts = res.data.accounts;
    allTransactions.push(...res.data.transactions);
    offset += res.data.transactions.length;
    if (offset >= res.data.total_transactions) break;
  }

  return { transactions: allTransactions, accounts };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const forceResync = searchParams.get('resync') === 'true';

  const { data: tokenRows } = await supabase.from('access_tokens').select('token');
  const end = new Date().toISOString().split('T')[0];

  // Normal refresh = last 30 days only (fast)
  // resync=true = full year from Jan 1 (slow, use sparingly)
  const start = forceResync ? '2026-01-01' : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  for (const row of tokenRows) {
    try {
      const { transactions, accounts } = await fetchAllTransactions(row.token, start, end);

      const accountMap = {};
      const excludedAccountIds = new Set(
        accounts.filter(a => EXCLUDED_SUBTYPES.has(a.subtype)).map(a => a.account_id)
      );
      for (const acct of accounts) {
        accountMap[acct.account_id] = acct.mask ? `${acct.name} ···${acct.mask}` : acct.name;
      }

      const settled = transactions.filter(t => !t.pending && !excludedAccountIds.has(t.account_id));

      for (const t of settled) {
        const accountName = accountMap[t.account_id] || null;
        const merchant = t.merchant_name || t.name;

        // Check by Plaid transaction_id first
        const { data: existingById } = await supabase
          .from('transactions')
          .select('id')
          .eq('id', t.transaction_id)
          .single();

        if (existingById) continue;

        // Also check by account + date + merchant + amount to catch SoFi duplicate IDs
        const { data: existingByContent } = await supabase
          .from('transactions')
          .select('id')
          .eq('account', accountName)
          .eq('date', t.date)
          .eq('merchant', merchant)
          .eq('amount', t.amount)
          .maybeSingle();

        if (existingByContent) continue;

        await supabase.from('transactions').insert({
          id: t.transaction_id,
          date: t.date,
          merchant,
          amount: t.amount,
          account: accountName,
          label: null,
          category: null,
          notes: '',
          archived: false,
        });
      }
    } catch (e) {
      console.error('Bad token, skipping:', row.token, e);
    }
  }

  const { data: saved } = await supabase
    .from('transactions')
    .select('*')
    .eq('archived', false)
    .order('date', { ascending: false });

  return NextResponse.json(saved);
}