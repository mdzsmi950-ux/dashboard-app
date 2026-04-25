import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('archived', false)
    .order('date', { ascending: false });
  return NextResponse.json(data || []);
}