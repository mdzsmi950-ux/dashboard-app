import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('manual_accounts')
    .select('*')
    .order('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  const { action, id, name, balance, balance_date } = await req.json();

  if (action === 'add') {
    const { data, error } = await supabase
      .from('manual_accounts')
      .insert({ name, balance: balance || 0, balance_date: balance_date || new Date().toISOString().split('T')[0] })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'update_balance') {
    const { error } = await supabase
      .from('manual_accounts')
      .update({ balance, balance_date })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    const { error } = await supabase
      .from('manual_accounts')
      .delete()
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
