import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('label_archived', true)
    .order('date', { ascending: false });
  return NextResponse.json(data || []);
}