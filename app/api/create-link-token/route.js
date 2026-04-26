import { plaidClient } from '@/lib/plaid';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'maddie' },
      client_name: 'Finance Dashboard',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: process.env.PLAID_REDIRECT_URI,
      hosted_link: {
        completion_redirect_uri: 'dashboard://hosted-link-complete',
        is_mobile_app: true,
      },
    });
    return NextResponse.json({
      link_token: res.data.link_token,
      hosted_link_url: res.data.hosted_link_url,
    });
  } catch (e) {
    console.error('Link token error:', e.response?.data || e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}