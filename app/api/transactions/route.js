import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const EXCLUDED_SUBTYPES = new Set(['student', 'ira', 'roth', 'brokerage', 'cash management', '401k', '403b', 'pension', 'retirement']);

export async function GET() {
  const { data: tokenRows } = await supabase
    .from('access_tokens')
    .select('token');

  const end = new Date().toISOString().split('T')[0];
  const start = '2026-01-01';

  for (const row of tokenRows) {
    try {
      const res = await plaidClient.transactionsGet({
        access_token: row.token,
        start_date: start,
        end_date: end,
      });

      const accountMap = {};
      const excludedAccountIds = new Set(
        res.data.accounts
          .filter(a => EXCLUDED_SUBTYPES.has(a.subtype))
          .map(a => a.account_id)
      );

      for (const acct of res.data.accounts) {
        accountMap[acct.account_id] = acct.mask ? `${acct.name} ···${acct.mask}` : acct.name;
      }

      const settled = res.data.transactions.filter(
        t => !t.pending && !excludedAccountIds.has(t.account_id)
      );

      for (const t of settled) {
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('id', t.transaction_id)
          .single();

        if (!existing) {
          await supabase.from('transactions').insert({
            id: t.transaction_id,
            date: t.date,
            merchant: t.merchant_name || t.name,
            amount: t.amount,
            account: accountMap[t.account_id] || null,
            label: null,
            category: null,
            notes: '',
            archived: false,
            label_archived: false,
            category_archived: false,
          });
        }
      }
    } catch (e) {
      console.error('Bad token, skipping:', row.token, e);
    }
  }

  const { data: saved } = await supabase
    .from('transactions')
    .select('*')
    .eq('label_archived', false)
    .order('date', { ascending: false });

  return NextResponse.json(saved);
}
