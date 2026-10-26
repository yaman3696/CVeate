import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkAdminPermission, permissionHeaders as headers } from '@/lib/admin-permissions'
import { ADMIN_PERMISSIONS } from '@/lib/admin-permission-catalog'

async function authorize(token: string | null) {
  const admin = await requireAdmin(token)
  if (!admin) return { error: NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers }) }
  if (!(await requireAdminMfa(token))) return { error: NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers }) }
  const denied = await checkAdminPermission(admin.id, 'permissions.manage')
  if (denied) return { error: denied }
  return { admin }
}
function failed(error: unknown) {
  if (error instanceof Error && 'digest' in error && error.digest === 'NEXT_PRERENDER_INTERRUPTED') throw error
  console.error('Admin permissions request failed')
  return NextResponse.json({ error: 'Unable to load or save permissions.' }, { status: 500, headers })
}
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')
  try {
    const access = await authorize(token)
    if (access.error) return access.error
    const page = Number(request.nextUrl.searchParams.get('page') || '1')
    const search = (request.nextUrl.searchParams.get('search') || '').trim()
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || search.length > 100) return NextResponse.json({ error: 'Invalid filters.' }, { status: 400, headers })
    let query = supabaseAdmin.from('profiles').select('id, full_name, created_at', { count: 'exact' }).eq('role', 'admin')
    if (search) query = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search) ? query.eq('id', search) : query.ilike('full_name', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
    const { data, count, error } = await query.order('created_at', { ascending: true }).order('id', { ascending: true }).range((page-1)*25,page*25-1)
    if (error) throw error
    const ids = (data ?? []).map(row => row.id)
    if (!ids.length) return NextResponse.json({ admins: [], total: count ?? 0, pageSize: 25, page }, { headers })
    const [sets, owners] = await Promise.all([
      supabaseAdmin.from('admin_permission_sets').select('user_id, permissions, version').in('user_id', ids),
      supabaseAdmin.from('admin_permission_owners').select('user_id').in('user_id', ids),
    ])
    if (sets.error || owners.error) throw new Error('Permissions unavailable')
    return NextResponse.json({ admins: (data ?? []).map(row => {
      const owner = (owners.data ?? []).some(item => item.user_id === row.id)
      const set = (sets.data ?? []).find(item => item.user_id === row.id)
      return { ...row, isOwner: owner, permissions: owner ? ADMIN_PERMISSIONS : set?.permissions ?? [], version: set?.version ?? 1 }
    }), total: count ?? 0, pageSize: 25, page }, { headers })
  } catch (error) { return failed(error) }
}
export async function PATCH(request: NextRequest) {
  const token = request.headers.get('authorization')
  try {
    const access = await authorize(token)
    if (access.error) return access.error
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid input.' }, { status: 400, headers })
    const { userId, permissions, version } = body as Record<string, unknown>
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || !Array.isArray(permissions) || permissions.length > 10 || !permissions.every(p => typeof p === 'string' && (ADMIN_PERMISSIONS as readonly string[]).includes(p)) || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) return NextResponse.json({ error: 'Invalid permission assignment.' }, { status: 400, headers })
    if (permissions.some(p => ['blog.create','blog.update','blog.delete','blog.publish'].includes(p)) && !permissions.includes('blog.read')) return NextResponse.json({ error: 'Article actions also require View articles and drafts.' }, { status: 400, headers })
    const { data, error } = await supabaseAdmin.rpc('set_admin_permissions', { p_actor_id: access.admin!.id, p_target_id: userId, p_permissions: [...new Set(permissions)], p_expected_version: version })
    if (error) {
      const status = error.code === '40001' ? 409 : error.code === '42501' ? 403 : error.code === '22023' ? 400 : 500
      const message = status === 409 ? 'Permissions changed in another session. Refresh before saving.' : status === 403 ? 'Owner permissions cannot be changed here.' : status === 400 ? 'The target must already be an administrator.' : 'Save failed. No permission or audit changes were committed.'
      return NextResponse.json({ error: message }, { status, headers })
    }
    return NextResponse.json({ success: true, version: data.version }, { headers })
  } catch (error) { return failed(error) }
}
