import 'server-only'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })
  }

  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7).trim())
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('cveate_credit_purchases')
    .select('id, provider, provider_order_id, provider_payment_id, amount_paise, currency, credits, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Billing purchases lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load payment history.' }, { status: 500 })
  }

  return NextResponse.json({ purchases: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
