import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const { month, type } = await req.json();
  const field = 'archived';
  await supabase
    .from('transactions')
    .update({ [field]: true })
    .like('date', `${month}%`);
  return NextResponse.json({ success: true });
}