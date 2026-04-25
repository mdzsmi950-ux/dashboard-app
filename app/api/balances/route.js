import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data: tokenRows } = await supabase
    .from('access_tokens')
    .select('token');

  const allAccounts = [];
  for (const row of tokenRows) {
    try {
      const res = await plaidClient.accountsBalanceGet({
        access_token: row.token,
      });
      const accounts = res.data.accounts.map(a => ({
        ...a,
        name: a.mask ? `${a.name} ···${a.mask}` : a.name,
      }));
      allAccounts.push(...accounts);
    } catch (e) {
      console.error('Bad token, skipping:', row.token, e);
    }
  }

  return NextResponse.json(allAccounts);
}
