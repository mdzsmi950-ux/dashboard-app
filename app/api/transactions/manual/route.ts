import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()

  const row = {
    id: body.id,
    date: body.date,
    amount: body.amount,
    merchant: body.merchant,
    account: body.account ?? null,
    label: null,
    category: body.category ?? null,
    notes: body.notes ?? '',
    archived: false,
  }

  const { error } = await supabase.from('transactions').insert([row])

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
