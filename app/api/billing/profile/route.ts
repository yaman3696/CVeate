import 'server-only'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })

type BillingDetails = {
  billing_name: string
  billing_email: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: 'IN'
}

async function getUser(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.startsWith('Bearer ')) return null
  const token = authorization.slice(7).trim()
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return error ? null : data.user
}

function parseBillingDetails(value: unknown): BillingDetails | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const field = (key: string) => typeof data[key] === 'string' ? (data[key] as string).trim() : ''

  const billing_name = field('billing_name')
  const billing_email = field('billing_email')
  const address_line1 = field('address_line1')
  const address_line2 = field('address_line2')
  const city = field('city')
  const state = field('state')
  const postal_code = field('postal_code')
  const country = field('country') || 'IN'

  if (
    billing_name.length < 2 || billing_name.length > 150 ||
    billing_email.length < 3 || billing_email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing_email) ||
    address_line1.length < 3 || address_line1.length > 250 ||
    address_line2.length > 250 ||
    city.length < 2 || city.length > 100 ||
    state.length < 2 || state.length > 100 ||
    !/^[0-9]{6}$/.test(postal_code) ||
    country !== 'IN'
  ) return null

  return {
    billing_name,
    billing_email,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country: 'IN',
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return json({ error: 'Please sign in first.' }, 401)

    const { data, error } = await supabaseAdmin
      .from('cveate_billing_profiles')
      .select('billing_name, billing_email, address_line1, address_line2, city, state, postal_code, country')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Billing profile lookup failed:', error)
      return json({ error: 'Unable to load billing details.' }, 500)
    }

    return json({ billing: data ?? null })
  } catch (error) {
    console.error('Billing profile GET failed:', error)
    return json({ error: 'Unable to load billing details.' }, 500)
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return json({ error: 'Please sign in first.' }, 401)

    const body = await request.json().catch(() => null)
    const billing = parseBillingDetails(body)
    if (!billing) {
      return json({ error: 'Please provide a valid name, email, Indian billing address, state and 6-digit PIN code.' }, 400)
    }

    const { error } = await supabaseAdmin
      .from('cveate_billing_profiles')
      .upsert({ user_id: user.id, ...billing, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (error) {
      console.error('Billing profile save failed:', error)
      return json({ error: 'Unable to save billing details.' }, 500)
    }

    return json({ success: true, billing })
  } catch (error) {
    console.error('Billing profile PUT failed:', error)
    return json({ error: 'Unable to save billing details.' }, 500)
  }
}
