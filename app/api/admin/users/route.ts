import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminUsersHeaders as headers, checkAdminUsersAccess } from '@/lib/admin-users-access'

export async function GET(request: NextRequest) {
  try {
    const denied = await checkAdminUsersAccess(request)
    if (denied) return denied
    const params = request.nextUrl.searchParams
    const page = Number(params.get('page') || '1')
    const search = (params.get('search') || '').trim()
    const role = params.get('role') || 'all'
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || search.length > 100 || !['all', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid filters.' }, { status: 400, headers })
    }
    const pageSize = 25
    let query = supabaseAdmin.from('profiles').select('id, full_name, role, career_credits, created_at', { count: 'exact' })
    // UUID search uses equality; name search uses a single parameterized filter.
    if (search) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)) query = query.eq('id', search)
      else query = query.ilike('full_name', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
    }
    if (role === 'admin') query = query.eq('role', 'admin')
    if (role === 'member') query = query.or('role.neq.admin,role.is.null')
    const { data, count, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: true }).range((page - 1) * pageSize, page * pageSize - 1)
    if (error) throw error
    return NextResponse.json({ users: data ?? [], total: count ?? 0, page, pageSize }, { headers })
  } catch (error) {
    // Let Next.js defer request-specific work to runtime during prerendering.
    if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
    console.error('Admin users list failed:', error)
    return NextResponse.json({ error: 'Unable to load users.' }, { status: 500, headers })
  }
}
