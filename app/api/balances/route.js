import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  // Read from Supabase cache
  const { data } = await supabase
    .from('balances')
    .select('*')
    .order('type');
  return NextResponse.json(data || []);
}

export async function POST() {
  // Called once per day to sync from Plaid → Supabase
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
        allAccounts.push({
          account_id: a.account_id,
          name: a.mask ? `${a.name} ···${a.mask}` : a.name,
          type: a.type,
          subtype: a.subtype,
          mask: a.mask,
          current_balance: a.balances.current,
          available_balance: a.balances.available,
          updated_at: new Date().toISOString().split('T')[0],
        });
      }
    } catch (e) {
      console.error('Bad token, skipping:', row.token, e);
    }
  }

  if (allAccounts.length > 0) {
    await supabase.from('balances').upsert(allAccounts, { onConflict: 'account_id' });
  }

  return NextResponse.json(allAccounts);
}