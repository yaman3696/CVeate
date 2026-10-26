import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { checkAdminPermission } from '@/lib/admin-permissions'
import { requireAdmin } from '@/lib/require-admin'
import { requireAdminMfa } from '@/lib/require-admin-mfa'

export const adminUsersHeaders = { 'Cache-Control': 'private, no-store' }
export async function checkAdminUsersAccess(request: NextRequest) {
  const token = request.headers.get('authorization')
  const admin = await requireAdmin(token)
  if (!admin) return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403, headers: adminUsersHeaders })
  if (!(await requireAdminMfa(token))) return NextResponse.json({ error: 'MFA_REQUIRED' }, { status: 403, headers: adminUsersHeaders })
  return checkAdminPermission(admin.id, 'users.read')
}
