import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data: tokenRows } = await supabase
    .from('access_tokens')
    .select('token');

  const seen = new Set();
  const allAccounts = [];
  for (const row of tokenRows) {
    try {
      const res = await plaidClient.accountsBalanceGet({ access_token: row.token });
      for (const a of res.data.accounts) {
        if (seen.has(a.account_id)) continue;
        seen.add(a.account_id);
        allAccounts.push({ ...a, name: a.mask ? `${a.name} ···${a.mask}` : a.name });
      }
    } catch (e) {
      console.error('Bad token, skipping:', row.token, e);
    }
  }

  return NextResponse.json(allAccounts);
}