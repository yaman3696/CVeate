import 'server-only'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ADMIN_PERMISSIONS, type AdminAccessPermission } from '@/lib/admin-permission-catalog'

export const permissionHeaders = { 'Cache-Control': 'private, no-store' }
export class PermissionsUnavailable extends Error {}
/** Caller must first validate the admin role and MFA. No implicit grants for missing rows. */
export async function getAdminPermissions(userId: string): Promise<{ isOwner: boolean; permissions: AdminAccessPermission[] }> {
  const owner = await supabaseAdmin.from('admin_permission_owners').select('user_id').eq('user_id', userId).maybeSingle()
  if (owner.error) throw new PermissionsUnavailable('Permission setup or lookup unavailable.')
  if (owner.data) return { isOwner: true, permissions: [...ADMIN_PERMISSIONS, 'permissions.manage'] }
  const grants = await supabaseAdmin.from('admin_permission_sets').select('permissions').eq('user_id', userId).maybeSingle()
  if (grants.error) throw new PermissionsUnavailable('Permission setup or lookup unavailable.')
  const allowed: string[] = Array.isArray(grants.data?.permissions) ? grants.data.permissions : []
  return { isOwner: false, permissions: ADMIN_PERMISSIONS.filter(key => allowed.includes(key)) }
}
export async function checkAdminPermission(userId: string, permission: AdminAccessPermission) {
  try {
    const access = await getAdminPermissions(userId)
    if (!access.permissions.includes(permission)) return NextResponse.json({ error: 'PERMISSION_DENIED', permission }, { status: 403, headers: permissionHeaders })
    return null
  } catch {
    return NextResponse.json({ error: 'PERMISSIONS_UNAVAILABLE', message: 'Permission setup is required or permissions could not be verified.' }, { status: 503, headers: permissionHeaders })
  }
}
