import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { supabaseAdmin } from '@/lib/supabase-admin'

const headers = { 'Cache-Control': 'private, no-store' }
const searchFields = ['provider_payment_id', 'provider_order_id', 'user_id', 'id', 'package_name'] as const
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  try {
    const admin = await requireAdmin(token)
    if (!admin) return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers })
    if (!(await requireAdminMfa(token))) return NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers })
    const permissionDenied = await checkAdminPermission(admin.id, 'revenue.read')
    if (permissionDenied) return permissionDenied

    const params = request.nextUrl.searchParams
    const page = Number(params.get('page') || '1')
    const search = (params.get('search') || '').trim()
    const field = params.get('field') || 'provider_payment_id'
    const status = params.get('status') || 'all'
    const from = params.get('from') || ''
    const to = params.get('to') || ''
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || search.length > 150 || !searchFields.includes(field as typeof searchFields[number]) || !['all', 'created', 'pending', 'completed', 'failed', 'refunded'].includes(status) || (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) || (search && ['id', 'user_id'].includes(field) && !uuid.test(search))) {
      return NextResponse.json({ error: 'Check the filters, date range, or full user/purchase ID.' }, { status: 400, headers })
    }
    const pageSize = 25
    let query = supabaseAdmin.from('cveate_credit_purchases').select('id, user_id, provider, provider_order_id, provider_payment_id, package_name, amount_paise, currency, credits, status, created_at', { count: 'exact' })
    if (status !== 'all') query = query.eq('status', status)
    if (search) query = field === 'package_name' ? query.ilike(field, `%${search.replace(/[\\%_]/g, '\\$&')}%`) : query.eq(field, search)
    // Calendar filters use India time, matching the website's operating timezone.
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00+05:30`).toISOString())
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999+05:30`).toISOString())
    const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1)
    if (error) throw error
    return NextResponse.json({ purchases: data ?? [], total: count ?? 0, page, pageSize }, { headers })
  } catch (error) {
    if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
    console.error('Admin revenue lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load purchase records.' }, { status: 500, headers })
  }
}
