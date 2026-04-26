import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('archived', true)
    .order('archived_at', { ascending: false, nullsFirst: false });
  return NextResponse.json(data || []);
}