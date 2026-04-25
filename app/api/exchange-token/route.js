import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { public_token } = await req.json();
  const res = await plaidClient.itemPublicTokenExchange({ public_token });
  const access_token = res.data.access_token;

  await supabase.from('access_tokens').insert({ token: access_token });

  return NextResponse.json({ success: true });
}