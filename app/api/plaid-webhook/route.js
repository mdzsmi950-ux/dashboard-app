import { plaidClient } from '@/lib/plaid';
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.json();
  const { webhook_type, webhook_code, public_tokens, link_token } = body;

  if (webhook_type === 'LINK' && webhook_code === 'SESSION_FINISHED' && public_tokens?.length) {
    for (const public_token of public_tokens) {
      try {
        const res = await plaidClient.itemPublicTokenExchange({ public_token });
        const access_token = res.data.access_token;
        await supabase.from('access_tokens').upsert({ token: access_token });
      } catch (e) {
        console.error('Token exchange error:', e.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}