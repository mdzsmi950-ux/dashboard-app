import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { id, field, val } = await req.json();
  if (!id || !field) {
    return NextResponse.json({ error: 'Missing id or field' }, { status: 400 });
  }

  const updates = { [field]: val };
  if (field === 'archived' && val === true) {
    updates.archived_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}