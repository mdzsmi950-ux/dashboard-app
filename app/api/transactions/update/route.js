import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { id, field, val } = await req.json();
  if (!id || !field) {
    return NextResponse.json({ error: 'Missing id or field' }, { status: 400 });
  }
  const { error } = await supabase
    .from('transactions')
    .update({ [field]: val })
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
