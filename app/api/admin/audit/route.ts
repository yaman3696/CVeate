import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { supabaseAdmin } from '@/lib/supabase-admin'

const headers = { 'Cache-Control': 'private, no-store' }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  try {
    const admin = await requireAdmin(token)
    if (!admin) return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers })
    if (!(await requireAdminMfa(token))) return NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers })
    const permissionDenied = await checkAdminPermission(admin.id, 'audit.read')
    if (permissionDenied) return permissionDenied

    const params = request.nextUrl.searchParams
    const page = Number(params.get('page') || '1')
    const action = params.get('action') || 'all'
    const actor = (params.get('actor') || '').trim()
    const resource = (params.get('resource') || '').trim()
    const from = params.get('from') || '', to = params.get('to') || ''
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !['all','blog.created','blog.updated','blog.deleted','permissions.updated','employee.invited','employee.accepted','employee.suspended','employee.restored','employee.revoked','employee.email_requested','employee.email_sent','employee.email_failed','employee.delete_requested','employee.deleted'].includes(action) || (actor && !uuid.test(actor)) || (resource && !uuid.test(resource)) || (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) return NextResponse.json({ error: 'Check the filters, full IDs, and date range.' }, { status: 400, headers })
    const pageSize = 25
    let query = supabaseAdmin.from('admin_audit_logs').select('id, actor_id, action, resource_type, resource_id, summary, metadata, created_at', { count: 'exact' })
    if (action !== 'all') query = query.eq('action', action)
    if (actor) query = query.eq('actor_id', actor)
    if (resource) query = query.eq('resource_id', resource)
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00+05:30`).toISOString())
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999+05:30`).toISOString())
    const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1)
    if (error) {
      if (['42P01', 'PGRST205'].includes(error.code)) return NextResponse.json({ error: 'AUDIT_SETUP_REQUIRED' }, { status: 503, headers })
      throw error
    }
    return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, pageSize }, { headers })
  } catch (error) {
    if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
    console.error('Admin audit lookup failed:', error)
    return NextResponse.json({ error: 'Unable to load audit logs.' }, { status: 500, headers })
  }
}
